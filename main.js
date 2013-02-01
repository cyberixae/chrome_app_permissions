
function print(content) {
  var body = document.getElementsByTagName('body')[0];
  body.innerHTML += content;
}

function render_list(items, style) {
  if (items.length > 0) {
    print('<ul style="' + style + '"><li>' + items.join('</li><li>') + '</li></ul>');
  }
}

function render(apps) {
  for(var i in apps) {
    var app = apps[i];
    var id = app.id;
    var name = app.name;
    var warnings = app.warnings;
    var permissions = app.permissions;
    var hostPermissions = app.hostPermissions;
    print('<h3>' + name + ' <span class="version">' + app.version + '</span></h3>');
    print('<p class="id">id: ' + app.id + '</p>');
    print('<p class="description">' + app.description + '</p>');
    render_list(warnings, 'color: #a00;');
    render_list(permissions, '');
    render_list(hostPermissions, '');
  }

}

apps = {}

function warnings_loaded(result) {
  print('<h1>Application Permissions</h1>')
  var app_war = {};
  var app_per = {};
  var app_hos = {};
  var app_bsc = {};

  for(var i in apps) {
    var app = apps[i];
    var id = app.id;
    if(app.warnings.length > 0) {
      app_war[id] = app;
    } else if(app.permissions.length > 0) {
      app_per[id] = app;
    } else if(app.hostPermissions.length > 0) {
      app_hos[id] = app;
    } else {
      app_bsc[id] = app;
    }
  }
  render(app_war);
  render(app_per);
  render(app_hos);
  render(app_bsc);
}

function load_warnings(ids, complete, i) {
  if (typeof(i) == typeof(undefined)) {
    i = ids.length - 1;
  }
  if (i < 0) {
      complete();
      return
  }
  var info = ids[i];
  var id = info.id;
  function recurse(warnings) {
    app = {};
    app.id = id;
    app.warnings = warnings;
    app.name = info.name;
    app.version = info.version;
    app.description = info.description;
    app.permissions = info.permissions;
    app.hostPermissions = info.hostPermissions;
    apps[id] = app;
    load_warnings(ids, complete, i - 1)
  }
  chrome.management.getPermissionWarningsById(id, recurse);

}

function infos(result) {
  function foo() {
    warnings_loaded(result);
  }
  load_warnings(result, foo);
}
window.onload = function() {
  chrome.management.getAll(infos)
}

