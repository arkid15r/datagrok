let t = DG.DataFrame.fromColumns([
    DG.Column.fromList('int', 'int', [1, 2, 3]),
    DG.Column.fromList('double', 'double', [1.1, 2.1, 3.1]),
    DG.Column.fromList('string', 'string', ["a", "b", "c"])
]);

grok.shell.addTableView(t);
