class UsageAnalysisPackage extends DG.Package {

  getSummary(summaryDf, counterType, title) {
    summaryDf.rows.match({counter_type: counterType}).select();
    let host = ui.block([],'d4-item-card card');
    host.appendChild(ui.h1(title));
    let list = [
      ['Day', summaryDf.get('day', summaryDf.selection.findNext(-1, 1))],
      ['Week', summaryDf.get('week', summaryDf.selection.findNext(-1, 1))],
      ['Month', summaryDf.get('month', summaryDf.selection.findNext(-1, 1))]
    ];
    summaryDf.selection.setAll(false);
    host.appendChild(ui.div([ui.table(list, (item, idx) =>
            [`${item[0]}:`, item[1]]
        )]
    ));
    return host;
  }

  //name: Usage Analysis
  //tags: app
  async startApp() {
    let view = grok.shell.newView('Usage Analysis');
    view.root.style.overflow = 'auto';
    let results = ui.div(this.users.root);
    //container for users tag editor
    let filters = ui.divH([],'filters');

    let summaryDf = await grok.data.query('UsageAnalysis:NewUsersEventsErrors');

    // containers for widgets
    let usersSummary = this.getSummary(summaryDf, 'users_count', 'New users');
    let eventsSummary = this.getSummary(summaryDf, 'events_count', 'New events');
    let errorsSummary = this.getSummary(summaryDf, 'errors_count', 'New errors');
    let usage = null;
    let errorList = null;
    let uniqueUsers = null;
    let uniqueUsersPerDay = null;
    let eventType = null;
    let errorType = null;
    let testTracking = null;

    let accToolbox = ui.accordion();
    let newUsersToolbox = ui.boolInput('New users', true, ()=>updateLayout());
    let newEventsToolbox = ui.boolInput('New events', true, ()=>updateLayout());
    let newErrorsToolbox = ui.boolInput('New errors', true, ()=>updateLayout());
    let uniqueUsersToolbox = ui.boolInput('Unique users', true, ()=>updateLayout());
    let uniqueUsersperDayToolbox = ui.boolInput('Unique users per day', true, ()=>updateLayout());
    uniqueUsersperDayToolbox.setTooltip('Unique users per day');
    let usageToolbox = ui.boolInput('Usage', true, ()=>updateLayout());
    let eventTypeToolbox = ui.boolInput('Event type', true, ()=>updateLayout());
    let errorTypeToolbox = ui.boolInput('Error type', true, ()=>updateLayout());
    let testTrackingToolbox = ui.boolInput('Test tracking', true, ()=>updateLayout());

    let date = ui.stringInput('Date', 'today');
    date.addPatternMenu('datetime');

    let userlist = null;
    let dock1 = grok.shell.dockManager;

    let addUser = ui.iconFA('plus', (x)=> {
      dock1.close(userlist);
      dock1.dock(userlist, 'left', null, 'Users', 0.17)
    });

    let users = this.users;
    let events = this.events;
    let isExactly = this.isExactly;

    function showUsage() {

      uniqueUsers = ui.block([],'cardbox');
      uniqueUsersPerDay = ui.block([],'cardbox');
      usage = ui.block([],'cardbox');
      errorList = ui.block([],'cardbox');
      eventType = ui.block([],'cardbox');
      errorType = ui.block([],'cardbox');
      testTracking = ui.block([],'cardbox');

      function addCardWithFilters(cardName, queryName, f, supportUsers = true) {
        queryName += 'OnDateAndUsersAndEvents';

          let host = ui.block([],'d4-item-card card');
          host.appendChild(ui.h1(cardName));
          let loader = ui.loader();
          host.appendChild(loader);
          let params = {'date': date.value, 'isExactly': isExactly.value};
          let selectedUsers = users.tags;

          params['users'] = (supportUsers && selectedUsers.length !== 0) ? selectedUsers : ['all'];
          params['events'] = (events.value.length !== 0) ? [isExactly.value ? events.value : events.value + '%'] : ['all'];

          grok.data.query('UsageAnalysis:' + queryName, params).then((t) => {
            if (cardName === 'Errors')
              grok.data.detectSemanticTypes(t);
            host.appendChild(f(t));
            host.removeChild(loader);
          });
          return host;
      }

      function addCard(cardName, queryName, f, supportUsers = false) {
          let host = ui.block([],'d4-item-card card');
          host.appendChild(ui.h1(cardName));
          let loader = ui.loader();
          host.appendChild(loader);
          let params = {'date': date.value};
          let selectedUsers = users.tags;

          if (supportUsers && selectedUsers.length !== 0) {
            queryName += 'AndUsers';
            params['users'] = selectedUsers;
          }
          grok.data.query('UsageAnalysis:' + queryName, params).then((t) => {
            if (cardName === 'Errors')
              grok.data.detectSemanticTypes(t);
            host.appendChild(f(t));
            host.removeChild(loader);
          });
          return host;
      }

      while (results.firstChild)
        results.removeChild(results.firstChild);

      function subscribeOnTableWithEvents(table) {
        table.onCurrentRowChanged.subscribe((_) => {
          grok.dapi.log.include('session.user').find(table.currentRow.event_id).then((event) => grok.shell.o = event);
        });
      }

      function getUniqueUsers(cardName){
        let host = ui.block([],'d4-item-card card');
        host.style.overflow="auto";
        host.style.height="94.5%";
        host.appendChild(ui.h1(cardName));
        let loader = ui.loader();
        host.appendChild(loader);
        grok.data.query('UsageAnalysis:UniqueUsersByDate', {'date': date.value})
          .then(t => {
            let ids = Array.from(t.getCol('id').values());
            grok.dapi.getEntities(ids).then((users) => {
              host.appendChild(ui.list(users));
            });
          });
        host.removeChild(loader);
        return host;
      }

      uniqueUsers.appendChild(getUniqueUsers('Unique Users'));
      uniqueUsersPerDay.appendChild(addCardWithFilters('Unique Users Per Day', 'UniqueUsersPerDay', (t) => DG.Viewer.lineChart(t).root));
      errorList.appendChild(addCardWithFilters('Error list', 'Errors', (t) => DG.Viewer.grid(t).root));
      usage.appendChild(
            addCardWithFilters('Usage', 'Events', (t) => {
              subscribeOnTableWithEvents(t);
              return DG.Viewer.scatterPlot(t, {'color': 'user'}).root;
            })
      );
      eventType.appendChild(addCard('Event Types', 'EventsSummaryOnDate', (t) => DG.Viewer.barChart(t, {valueAggrType: 'avg'}).root));
      errorType.appendChild(addCard('Error Types', 'ErrorsSummaryOnDate', (t) => DG.Viewer.barChart(t, {valueAggrType: 'avg'}).root));
      testTracking.appendChild(addCard('Test Tracking', 'ManualActivityByDate', (t) => DG.Viewer.grid(t).root, false));
      results.append(
          ui.divH([usersSummary,eventsSummary,errorsSummary]),
          ui.divH([uniqueUsers,uniqueUsersPerDay]),
          ui.divH([usage]),
          ui.divH([errorList]),
          ui.divH([eventType,errorType]),
          ui.divH([testTracking])
      );

      updateUsersList();
      updateLayout();
    }

    date.onChanged(this.debounce(showUsage, 750));
    this.users.onChanged(showUsage);
    this.events.onChanged(this.debounce(showUsage, 750));
    this.isExactly.onChanged(showUsage);

    showUsage();

    accToolbox.addPane('Services', () => ui.wait(async () => {
      let root = ui.div();
      let serviceInfos = await grok.dapi.admin.getServiceInfos();
      root.appendChild(ui.table(serviceInfos, (item, idx) =>
        [`${item.key}:`, $(ui.span([item.status])).addClass(`grok-plugin-status-${item.status.toLowerCase()}`)[0]]));
      return root;
    }), true);

    accToolbox.addPane('Filters', () => ui.div([
      date.root,
      this.events.root,
      this.isExactly.root,
      ui.div([ui.divH([ui.label('Add users'),addUser])])
    ],'toolbox-inputs'), false);

    accToolbox.addPane('Widgets', () => ui.inputs([
      newUsersToolbox,
      newEventsToolbox,
      newErrorsToolbox,
      uniqueUsersToolbox,
      uniqueUsersperDayToolbox,
      usageToolbox,
      eventTypeToolbox,
      errorTypeToolbox,
      testTrackingToolbox,
    ]), false);

    // Checking if the layout widget was hide or show
    function updateLayout(){
      (!newUsersToolbox.value ? $(usersSummary).hide() : $(usersSummary).show());
      (!newEventsToolbox.value ? $(eventsSummary).hide() : $(eventsSummary).show());
      (!newErrorsToolbox.value ? $(errorsSummary).hide() : $(errorsSummary).show());
      (!uniqueUsersToolbox.value ? $(uniqueUsers).hide() : $(uniqueUsers).show());
      (!uniqueUsersperDayToolbox.value ? $(uniqueUsersPerDay).hide() : $(uniqueUsersPerDay).show());
      (!usageToolbox.value ? $(usage).hide() : $(usage).show());
      (!eventTypeToolbox.value ? $(eventType).hide() : $(eventType).show());
      (!errorTypeToolbox.value ? $(errorType).hide() : $(errorType).show());
      (!testTrackingToolbox.value ? $(testTracking).hide() : $(testTracking).show());
    }

    // Add users to dock manager
    function updateUsersList(){
    userlist = ui.panel();
    $(userlist).addClass('user-list');
    grok.dapi.users
	   .order('login')
	    .list()
	    .then((allUsers) => userlist.appendChild(ui.divV(allUsers.map((p) => addUsersToList(p.name, p.login, p.picture)  ))));
    }

    // Checking if the tag editor doesn't have users and show them
    function addUsersToList(name,user,avatar){
      let className = '.'+name;
      let host = ui.divH([avatar, name, ui.button(ui.iconFA('plus-circle',()=>addUserToFilter(name, user))) ],name);
      $(host).css('align-items','center');
      if (users.tags.includes(user) == false){
        $(className).show()
        return host;
      }
    }
    // Add user from dock to tag editor and hide them from dock manager
    function addUserToFilter(name, user) {
      let className = '.'+name;
      users.addTag(user);
      return $(className).hide()
    }

    view.root.append(this.users.root);
    view.root.append(results);
    view.toolbox = accToolbox.root;
  }

  async init() {
    this.users = DG.TagEditor.create();
    this.events = ui.stringInput('Events', '');
    this.isExactly = ui.boolInput('Exact m...', false);
    this.isExactly.setTooltip('Exact matching');

    grok.events.onContextMenu.subscribe((args) => {
      if (args.args.item instanceof DG.User) {
        args.args.menu.item('Add user to filter', async () => this.addUserToFilter(args.args.item.login));
      } else if (args.args.item instanceof DG.LogEvent) {
        args.args.menu.item('Add event to filter', async () => {
          this.events.value = args.args.item.name;
          this.isExactly.value = true;
        });
      }
    });
  }

  debounce(fn, time) {
    let timeout;
    return function () {
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
