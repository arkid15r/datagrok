grok.data.loadDataFrame('https://www.quandl.com/api/v1/datasets/WIKI/AAPL.csv')
    .then(t => grok.shell.addTableView(t));
