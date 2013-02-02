
function render_list(items, style) {
  if (items.length > 0) {
    return '<ul style="' + style + '"><li>' + items.join('</li><li>') + '</li></ul>';
  }
  return '';
}


function remove(id) {
  var obsolete = document.getElementById('app-' + id);
  if (typeof(obsolete) == typeof(undefined)) {
    return;
  }
  obsolete.parentNode.removeChild(obsolete);

}

function get_delete_cb(id) {
  return function(event) {
    try {
    chrome.management.uninstall(id, {"showConfirmDialog": true});
    } catch(e) {
      console.log(e);
    }
    event.preventDefault();
  }
}

function uninstall_link(id) {
    var link_text = document.createTextNode('Uninstall');
    var uninstall_link = document.createElement('a');
    uninstall_link.setAttribute('href', '#');
    uninstall_link.appendChild(link_text);
    uninstall_link.addEventListener('click', get_delete_cb(id));
    return uninstall_link;
}

function render(apps) {
  var h_apps = [];
  for(var i in apps) {
    var app = apps[i];
    var id = app.id;
    var name = app.name;
    var warnings = app.warnings;
    var permissions = app.permissions;
    var hostPermissions = app.hostPermissions;
    var logo = '<img src="' + app.icon + '" width="48" style="float: right;" />';
    var h_name = '<h2>' + name + ' <span class="version">' + app.version + '</span></h2>';
    var p_desc = '<p class="description">' + app.description + logo + '</p>';
    var ul_war = render_list(warnings, 'color: #a00;');
    if (ul_war == '') {
      var war = '';
    } else {
      var war = '<p class="itcan">It can:</p>' + ul_war;
    }
    var ul_per = render_list(permissions, '');
    if (ul_per == '') {
      var per = '';
    } else {
      var per = '<h3>Permissions:</h3>' + ul_per;
    }
    var ul_hper = render_list(hostPermissions, '')
    if (ul_hper == '') {
      var hper = '';
    } else {
      var hper = '<h3>Host Permissions:</h3>' + ul_hper;
    }
    var store_text = document.createTextNode('Show Web Store page');
    var store_url = 'https://chrome.google.com/webstore/detail/' + id;
    var store_link = document.createElement('a');
    store_link.setAttribute('href', store_url);
    store_link.appendChild(store_text);

    var uninstall = uninstall_link(id);

    var bbar = document.createElement("p");
    bbar.setAttribute('class', 'bottombar');
    bbar.appendChild(uninstall);
    bbar.appendChild(store_link);
    var id_text = document.createTextNode(' application ID: ' + app.id);
    var id_field = document.createElement("span");
    id_field.setAttribute('class', 'idfield');
    id_field.appendChild(id_text);
    bbar.appendChild(id_field);

    var sec_app = document.createElement("section");
    sec_app.setAttribute('class', 'app');
    sec_app.setAttribute('id', 'app-' + id);
    sec_app.innerHTML = h_name + p_desc + war + per + hper;
    sec_app.appendChild(bbar);
    h_apps.push(sec_app);
  }
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

  heading = document.createTextNode('Permission Viewer');
  h_app = document.createElement("h1");
  h_app.appendChild(heading);
  sec_war = render(app_war);
  sec_per = render(app_per);
  sec_hos = render(app_hos);
  sec_bsc = render(app_bsc);

  sec_apps = sec_war.concat(sec_per, sec_hos, sec_bsc);

  sec_main = document.createElement("section");
  sec_main.setAttribute('id', 'main');
  sec_main.appendChild(h_app);
  for (var i in sec_apps) {
    var s = sec_apps[i];
    sec_main.appendChild(s);
  }
  
  var old_main = document.getElementById('main');
  document.body.replaceChild(sec_main, old_main);

}

function select_icon(icons) {
  urls = {}
  for (var i in icons) {
    var icon = icons[i];
    urls[icon.size] = icon.url;
  }
  exact = urls[48];
  if (typeof(exact) != typeof(undefined)) {
    return exact;
  }
  sizes = Object.keys(urls);
  m = Math.max.apply(Math, sizes);
  return urls[m];
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
  if (info.type == 'theme') {
      load_warnings(ids, complete, i - 1)
      return;
  }
  var id = info.id;
  function recurse(warnings) {
    app = {};
    app.id = id;
    app.warnings = warnings;
    app.name = info.name;
    app.icon = select_icon(info.icons);
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
  function continuation() {
    warnings_loaded(result);
  }
  load_warnings(result, continuation);
}

function refresh() {
  chrome.management.getAll(infos)
}

window.onload = function() {
  chrome.management.onUninstalled.addListener(remove);
  chrome.management.onInstalled.addListener(refresh);
  refresh();
}

