'use strict';
(function() {
	var $ = q => window.document.querySelector(q);
	var $$ = q => Array.from(window.document.querySelectorAll(q));
	var sum = (a, b) => a + b;

	// JSONを纏めてfetchして辞書作る
	// returns: Promise< Map<カード名:カード情報> >
	var load_dict = function() {
		const files = [
			// from https://mtgjson.com/
			'./dict/DTK.json',
			'./dict/ORI.json',
			'./dict/BFZ.json',
			'./dict/OGW.json',
			'./dict/SOI.json',
			'./dict/EMN.json'
		];

		// fetch処理PromiseをArrayに固める
		var promises = [];
		files.forEach(url => {
			promises.push(
				// fetchしてjsonパースして.cards(Array<Object>)を抽出
				window.fetch(url)
					.then(res => res.json())
					.then(json => json.cards)
			);
		});

		// Promiseを実行
		return Promise.all(promises)
			.then(dicts => {
				// 全エキスパンションを1つのArrayに連結し,更にそれをMap化(カード名:カード情報)
				return Array.concat.apply([], dicts)
					.reduce((map, e) => {map.set(e.name, e); return map;}, new Map());
			})
			.catch(e => window.console.error(e));
	};

	// デッキリスト文字列を解釈,[{count:枚数, name:カード名}]で返す
	var parse = function(text) {
		return text.split('\n')
			.filter(a => /^[0-9]+/.test(a))
			.map(line => {
				var p = line.split(/\s/);
				return {
					'count': parseInt(p[0]),
					'name': p.splice(1).join(' ')
				};
			});
	};

	// 解釈済みデッキリストにカード辞書を適用する
	var apply_dict = function(list) {
		return list
			.filter(p => window.dict.has(p.name))
			.map(p => {
				var info = window.dict.get(p.name);

				Object.entries(info).forEach(kv => {
					var key, value;
					[key, value] = kv;
					p[key] = value;
				});

				return p;
			});
	};

	// 解釈済みデッキリストから各種情報を得る
	var calculate = function(list) {
		// 総カード数
		var total = list
			.map(c => c.count)
			.reduce(sum, 0);

		// カードタイプ
		var types = {'Artifact': 0, 'Creature': 0, 'Enchantment': 0, 'Instant': 0, 'Land': 0, 'Planeswalker': 0, 'Sorcery': 0, 'Tribal': 0};
		list.forEach(c => {
			c.types.forEach(t => {types[t] += c.count;});
		});

		// 色マナシンボル数
		var symbols_enum = list
			.filter(c => 'manaCost' in c)
			.map(c => c.manaCost.repeat(c.count))
			.join('')
			.replace(/[{}0-9]/g, '');
		var symbols = {};
		['u','w','r','g','b'].forEach(c => {
			symbols[c] = symbols_enum.replace(new RegExp('[^' + c + ']', 'gi'), '').length;
		});

		// マナカーブ
		var curve = new Array(14).fill(0);
		list
			.filter(c => 'cmc' in c)
			.forEach(c => {curve[c.cmc] += c.count;});

		return {
			'list': list,
			'total': total,
			'symbols': symbols,
			'types': types,
			'curve': curve
		};
	};

	// 各種デッキ情報を出力する
	var output = function(result) {
		$('#total').textContent = result.total;
		['u','w','r','g','b'].forEach(c => {
			$('#symbols-' + c).textContent = result.symbols[c];
		});
		['Artifact', 'Creature', 'Enchantment', 'Instant', 'Land', 'Planeswalker', 'Sorcery', 'Tribal'].forEach(t => {
			$('#types-' + t.toLowerCase()).textContent = result.types[t];
		});

		$('#curve').textContent = '';
		new window.Morris.Bar({
			'element': 'curve',
			'data': result.curve.map((e, i) => {return {'mana': i, 'value': e};}),
			'xkey': 'mana',
			'ykeys': ['value'],
			'labels': ['#'],
			'hideHover': 'always'
		});

		$('#cards').textContent = '';
		result.list
			.sort((a, b) => a.cmc - b.cmc)
			.forEach(c => {
				var card = window.document.importNode($('#template-card').content, true);

				card.querySelector('.count').textContent = c.count;
				card.querySelector('.name').textContent = c.name;
				card.querySelector('.type').textContent = c.type;

				if (c.manaCost) {
					var manaSymbols = c.manaCost.split(/[{}]+/).filter(e => e.length > 0);
					manaSymbols.forEach(symbol => {
						var i = window.document.createElement('i');
						i.classList.add('mi', 'mi-mana', 'mi-' + symbol.toLowerCase());
						card.querySelector('.manaCost').appendChild(i);
					});
				}

				$('#cards').appendChild(card);
			});
	};

	window.addEventListener('load', function f() {
		load_dict()
			.then(dict => {
				window.dict = dict;
				window.console.log(window.dict);

				output(calculate(apply_dict(parse($('#input').value))));
			});

		$('#input').addEventListener('keyup', ev => {
			output(calculate(apply_dict(parse(ev.target.value))));
		});

		window.removeEventListener('load', f);
	});
})();
