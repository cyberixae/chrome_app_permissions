"use strict";

function render_list(items, style) {
  if (items.length > 0) {
    return '<ul style="' + style + '"><li>' + items.join('</li><li>') + '</li></ul>';
  }
  return '';
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

function store_link(id) {
  var store_text = document.createTextNode('Show Web Store page');
  var store_url = 'https://chrome.google.com/webstore/detail/' + id;
  var store_link = document.createElement('a');
  store_link.setAttribute('href', store_url);
  store_link.appendChild(store_text);
  return store_link;
}

function render_app(app) {
  var id = app.id;
  var name = app.name;
  var warnings = app.warnings;
  var permissions = app.permissions;
  var hostPermissions = app.hostPermissions;
  var logo = '<img src="' + app.icon + '" width="48" style="float: right;" />';
  var h_name = '<h2>' + name + ' <span class="version">' + app.version + '</span></h2>';
  var p_desc = '<table class="description"><tr><td>' + app.description + '</td><td>' + logo + '</td></tr></table>';
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

  var store = store_link(id);
  var uninstall = uninstall_link(id);

  var bbar = document.createElement("p");
  bbar.setAttribute('class', 'bottombar');
  bbar.appendChild(uninstall);
  bbar.appendChild(store);

  var sec_app = document.createElement("section");
  if (app.enabled) {
    var classes = 'app enabled';
  } else {
    var classes = 'app';
  }
  sec_app.setAttribute('class', classes);
  sec_app.setAttribute('id', 'app-' + id);
  sec_app.innerHTML = h_name + p_desc + war + per + hper;
  sec_app.appendChild(bbar);

  return sec_app;
}

function render_apps(apps) {
  var elements = [];
  for(var i in apps) {
    var app = apps[i];
    var element = render_app(app);
    elements.push(element);
  }
  return elements;
}

function order_apps_by_infos(apps) {
  var warnings = [];
  var permissions = [];
  var host_permissions = [];
  var other = [];
  for(var i in apps) {
    var app = apps[i];
    if(app.warnings.length > 0) {
      warnings.push(app);
    } else if(app.permissions.length > 0) {
      permissions.push(app);
    } else if(app.hostPermissions.length > 0) {
      host_permissions.push(app);
    } else {
      other.push(app);
    }
  }
  var ordered = warnings.concat(permissions, host_permissions, other);
  return ordered;
}

function add_elements(target, items) {
  for (var i in items) {
    var item = items[i];
    target.appendChild(item);
  }
}

function main_section(apps) {
  var heading_text = document.createTextNode('Permission Viewer');
  var heading = document.createElement("h1");
  heading.appendChild(heading_text);
  var main_section = document.createElement("section");
  main_section.setAttribute('id', 'main');
  main_section.appendChild(heading);
  var ordered = order_apps_by_infos(apps);
  var rendered = render_apps(ordered)
  add_elements(main_section, rendered);
  return main_section;
}

function redraw_page(apps) {
  var new_main = main_section(apps);
  var old_main = document.getElementById('main');
  document.body.replaceChild(new_main, old_main);
}

function select_icon(icons) {
  var urls = {}
  for (var i in icons) {
    var icon = icons[i];
    urls[icon.size] = icon.url;
  }
  var exact = urls[48];
  if (typeof(exact) != typeof(undefined)) {
    return exact;
  }
  var sizes = Object.keys(urls);
  var m = Math.max.apply(Math, sizes);
  return urls[m];
}

function app_from_info(info) {
  var app = {};
  app.id = info.id;
  app.name = info.name;
  app.icon = select_icon(info.icons);
  app.enabled = info.enabled;
  app.version = info.version;
  app.description = info.description;
  app.permissions = info.permissions;
  app.hostPermissions = info.hostPermissions;
  return app;
}

/* Recursion was used to avoid synchronization problems.
 * API documentation hinted that getPermissionWarningsById
 * would also return the result, but that was not the case.
 */
function collect_app_data(app_infos, apps, complete) {
  function _collect_app_data(app_infos, apps, complete, i) {
    if (i < 0) {
      complete();
      return;
    }
    var info = app_infos[i];
    var id = info.id;
    var app = app_from_info(info);
    function add_warnings(warnings) {
      app.warnings = warnings;
      _collect_app_data(app_infos, apps, complete, i - 1);
    }
    apps[id] = app;
    chrome.management.getPermissionWarningsById(id, add_warnings);
  }
  var last_index = app_infos.length - 1;
  _collect_app_data(app_infos, apps, complete, last_index);
}

function remove_themes(infos) {
  function not_theme(info) {
    var is_theme = info.type == 'theme';
    return !is_theme
  }
  var app_infos = infos.filter(not_theme)
  return app_infos;
}

function update_app_data(infos) {
  var apps = {}
  function continuation() {
    redraw_page(apps);
  }
  var app_infos = remove_themes(infos);
  collect_app_data(app_infos, apps, continuation);
}

function remove_app_element(id) {
  var obsolete = document.getElementById('app-' + id);
  if (typeof(obsolete) == typeof(undefined)) {
    return;
  }
  obsolete.parentNode.removeChild(obsolete);
}

function refresh_page() {
  chrome.management.getAll(update_app_data)
}

window.onload = function() {
  chrome.management.onUninstalled.addListener(remove_app_element);
  chrome.management.onInstalled.addListener(refresh_page);
  refresh_page();
}

