class UsageAnalysisPackage extends DG.Package {

    //name: Usage Analysis
    //tags: app
    startApp() {
        let acc = null;
        let view = grok.shell.newView('Usage');
        view.root.style.overflow = 'auto';
        let results = ui.div();
        let panesExpanded = {};

        let date = ui.stringInput('Date', 'today');
        date.root.classList.add('usage-analysis-date', 'pure-form');
        date.addPatternMenu('datetime');

        let users = DG.TagEditor.create();
        users.acceptsDragDrop = (x) => x instanceof User;
        users.doDrop = (user) => users.addTag(user.login);

        let addUser = ui.div([ui.iconFA('plus', () => {
            grok.dapi.users.order('login').list().then((allUsers) => {
                DG.Menu.popup()
                    .items(allUsers.map(u => u.login), (item) => users.addTag(item))
                    .show();
            });
        })], 'usage-analysis-users-plus');

        function showUsage() {
            if (acc !== null)
                for (let p of acc.panes)
                    panesExpanded[p.name] = p.expanded;

            acc = ui.accordion();

            function addPane(paneName, queryName, f, supportUsers = true) {
                if (!(paneName in panesExpanded))
                    panesExpanded[paneName] = false;
                acc.addPane(paneName, () => {
                    let host = ui.div([], 'usage-analysis-card');
                    host.appendChild(ui.loader());
                    let params = {'date': date.value};
                    let selectedUsers = users.tags;
                    if (supportUsers && selectedUsers.length !== 0) {
                        queryName += 'AndUsers';
                        params['users'] = selectedUsers;
                    }
                    grok.data.query('UsageAnalysis:' + queryName, params).then((t) => {
                        if (paneName === 'Errors')
                            grok.data.detectSemanticTypes(t);
                        host.removeChild(host.firstChild);
                        host.appendChild(f(t));
                    });
                    return host;
                }, panesExpanded[paneName]);
            }

            while (results.firstChild)
                results.removeChild(results.firstChild);

            acc.addPane('Summary', () => ui.wait(async () => {
                let root = ui.div();

                let lastUsers = await grok.data.query('UsageAnalysis:NewUsersLastMonthWeekDay');
                let newEvents = await grok.data.query('UsageAnalysis:NewEventsLastMonthWeekDay');
                let newErrors = await grok.data.query('UsageAnalysis:NewErrorsLastMonthWeekDay');
                let summ = [
                    ['New users', lastUsers],
                    ['New events', newEvents],
                    ['New errors', newErrors],
                ];

                root.appendChild(ui.table(summ, (item, idx) =>
                    [`${item[0]}:`, item[1].get('day', 0), item[1].get('week', 0), item[1].get('month', 0)],
                    ['', 'Day', 'Week', 'Month']));

                let totalUsersCount = await grok.data.query('UsageAnalysis:TotalUsersCount');
                root.appendChild(ui.span([`Total users: ${totalUsersCount.get(0, 0)}`]));

                root.appendChild(ui.h2('Services'));
                let serviceInfos = await grok.dapi.admin.getServiceInfos();
                root.appendChild(ui.table(serviceInfos, (item, idx) =>
                    [`${item.key}:`, $(ui.span([item.status])).addClass(`grok-plugin-status-${item.status.toLowerCase()}`)[0]], ['Service', 'Status'] ));

                return root;
            }));

            addPane('Unique users per day for the last month', 'UniqueUsersPerDayLastMonth', (t) => DG.Viewer.lineChart(t).root);

            acc.addPane('Unique users', () => {
                let host = ui.div();
                host.appendChild(ui.loader());
                grok.data.query('UsageAnalysis:UniqueUsersByDate', {'date': date.value})
                    .then(t => {
                        let ids = Array.from(t.getCol('id').values());
                        grok.dapi.getEntities(ids).then((users) => {
                            host.removeChild(host.firstChild);
                            host.appendChild(ui.list(users));
                        });
                    });
                return host;
            });

            addPane('Usage', 'EventsOnDate', (t) => {
                t.onCurrentRowChanged.subscribe((something) => {
                    grok.dapi.log.find(t.currentRow.event_id).then((event) => {
                          let root = ui.div([], 'd4-accordion');

                          root.append(ui.h1(['Event']));
                          root.append(ui.span(['Name: ', event.name]));
                          root.append(ui.span(['Description: ', event.description]));
                          root.append(ui.span(['Source: ', event.source]));
                          root.append(ui.span(['Session: ', event.session]));

                          grok.shell.o = root;
                    });

                });
                return DG.Viewer.scatterPlot(t, {'color': 'user'}).root;
            });
            addPane('Errors', 'ErrorsOnDate', (t) => DG.Viewer.grid(t).root);
            addPane('Event Types', 'EventsSummaryOnDate', (t) => DG.Viewer.barChart(t).root);
            addPane('Error Types', 'ErrorsSummaryOnDate', (t) => DG.Viewer.barChart(t).root);
            addPane('Test Tracking', 'ManualActivityByDate', (t) => DG.Viewer.grid(t).root, false);

            results.appendChild(acc.root);
        }

        date.onChanged(this.debounce(showUsage, 750));
        users.onChanged(showUsage);

        showUsage();

        let usersLabel = ui.div(null, 'usage-analysis-users-title');
        usersLabel.innerText = 'Users';

        let usersSelection = ui.divV([
            ui.divH([usersLabel, addUser]),
            users.root
        ], 'usage-analysis-users');
        usersSelection.style.marginBottom = '12px';

        let accToolbox = ui.accordion();
        accToolbox.addPane('Filters', () => ui.divV([
            date.root,
            usersSelection
        ]), true);
        accToolbox.addPane('Layouts', () => {
            let link = ui.divText('Summary');
            link.classList.add('d4-link-label');
            return link;
        }, true);

        view.root.appendChild(results);
        view.toolbox = accToolbox.root;
    }

    /*
        // Aggregation
        grok.scriptSync('ExtractValue("events", "utc_timestamp", "date")');
        grok.scriptSync('SplitByRegExp("events", "event_info_json", "\\\"NumStructures\\\"\\: (\\d*)\\,")');
        grok.scriptSync('Aggregate("events", pivots = [], aggregations = ["sum(r)"], groupByFields = ["date(utc_timestamp)"])');

        var t = grok.shell.getTableView('result').table;
        var r = t.cols.byName('sum(r)');
        var col = t.cols.addNew('sum', 'int');
        var sum = 0;
        for (let i = 0; i < t.rowCount; i++) {
          if (!r.isNone(i))
              col.set(i, sum += r.get(i));
        }
     */

    debounce(fn, time) {
        let timeout;
        return function() {
            const functionCall = () => fn.apply(this, arguments);
            clearTimeout(timeout);
            timeout = setTimeout(functionCall, time);
        }
    }


    //name: Create JIRA ticket
    //description: Creates JIRA ticket using current error log
    //tags: panel, widgets
    //input: string msg {semType: ErrorMessage}
    //output: widget result
    //condition: true
    createJiraTicket(msg) {
        let root = ui.div();

        let summary = ui.stringInput('Summary', '');
        let description = ui.stringInput('Description', msg);

        let button = ui.bigButton('CREATE', () => {
            grok.data.query('Vnerozin:JiraCreateIssue', {
                'createRequest': JSON.stringify({
                    "fields": {
                        "project": {
                            "key": "GROK"
                        },
                        "summary": summary.value,
                        "description": description.value,
                        "issuetype": {
                            "name": "Bug"
                        }
                    }
                }),
                'updateHistory': false,
            }).then((t) => {
                grok.shell.info('Created');
            });
        });
        button.style.marginTop = '12px';

        root.appendChild(ui.inputs([summary, description]));
        root.appendChild(button);

        return new DG.Widget(root);
    }
}
