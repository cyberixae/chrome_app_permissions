
function render_list(items, style) {
  if (items.length > 0) {
    return '<ul style="' + style + '"><li>' + items.join('</li><li>') + '</li></ul>';
  }
  return '';
}

function render(apps) {
  var h_apps = '';
  for(var i in apps) {
    var app = apps[i];
    var id = app.id;
    var name = app.name;
    var warnings = app.warnings;
    var permissions = app.permissions;
    var hostPermissions = app.hostPermissions;
    var h_name = '<h2>' + name + ' <span class="version">' + app.version + '</span></h2>';
    var p_id = '<p class="id">id: ' + app.id + '</p>';
    var p_desc = '<p class="description">' + app.description + '</p>';
    var ul_war = render_list(warnings, 'color: #a00;');
    var ul_per = render_list(permissions, '');
    var ul_hper = render_list(hostPermissions, '');
    var sec_app = '<section class="app">' + h_name + p_id + p_desc + ul_war + ul_per + ul_hper + '</section>'
    h_apps += sec_app;
  }
  h_apps += '</section>';
  return h_apps;
}

apps = {}

function warnings_loaded(result) {
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

  h_app = '<h1>Permission Viewer</h1>';
  sec_war = render(app_war);
  sec_per = render(app_per);
  sec_hos = render(app_hos);
  sec_bsc = render(app_bsc);
  sec_main = '<section>' + h_app + sec_war + sec_per + sec_hos + sec_bsc + '</section>';

  var body = document.getElementsByTagName('body')[0];
  body.innerHTML = sec_main;

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

