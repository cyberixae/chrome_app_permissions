"use strict";

function get_delete_cb(id) {
  return function(event) {
    chrome.management.uninstall(id, {"showConfirmDialog": true});
    event.preventDefault();
  }
}

function get_disable_cb(id) {
  return function(event) {
    chrome.management.setEnabled(id, false);
    event.preventDefault();
  }
}

function get_enable_cb(id) {
  return function(event) {
    chrome.management.setEnabled(id, true);
    event.preventDefault();
  }
}

function render_list(items, style) {
  if (items.length > 0) {
    return '<ul style="' + style + '"><li>' + items.join('</li><li>') + '</li></ul>';
  }
  return '';
}

function uninstall_link(id) {
    var link_text = document.createTextNode('Uninstall');
    var link = document.createElement('a');
    link.setAttribute('href', '#');
    link.appendChild(link_text);
    link.addEventListener('click', get_delete_cb(id));
    return link;
}

function enable_link(id) {
    var link_text = document.createTextNode('Enable');
    var link = document.createElement('a');
    link.setAttribute('class', 'enable');
    link.setAttribute('href', '#');
    link.appendChild(link_text);
    link.addEventListener('click', get_enable_cb(id));
    return link;
}

function disable_link(id) {
    var link_text = document.createTextNode('Disable');
    var link = document.createElement('a');
    link.setAttribute('class', 'disable');
    link.setAttribute('href', '#');
    link.appendChild(link_text);
    link.addEventListener('click', get_disable_cb(id));
    return link;
}

function store_link(id) {
  var store_text = document.createTextNode('Show Web Store page');
  var store_url = 'https://chrome.google.com/webstore/detail/' + id;
  var store_link = document.createElement('a');
  store_link.setAttribute('href', store_url);
  store_link.appendChild(store_text);
  return store_link;
}

function permission_view(warnings, heading, class_name) {
  var ul_war = render_list(warnings, '');
  if (ul_war == '') {
    var empty = document.createTextNode('');
    return empty;
  } else {
    var war = document.createElement("div");
    war.setAttribute('class', class_name);
    war.innerHTML = '<p class="list_head">' + heading + ':</p>' + ul_war;
    return war;
  }
}

function app_heading(name, version) {
  var heading = document.createElement("h2");
  heading.innerHTML = name + ' <span class="version">' + version + '</span>';
  return heading;
}

function app_description(description, icon_url) {
  var table = document.createElement("table");
  table.setAttribute('class', 'description');
  var logo = '<img src="' + icon_url + '" width="48" style="float: right;" />';
  table.innerHTML = '<tr><td>' + description + '</td><td>' + logo + '</td></tr>';
  return table;
}

function app_classes(enabled) {
  if (enabled) {
    var classes = 'app';
  } else {
    var classes = 'app disabled';
  }
  return classes;
}

function render_app(app) {
  var heading = app_heading(app.name, app.version);
  var description = app_description(app.description, app.icon);
  var warnings = permission_view(app.warnings, 'It can', 'itcan');
  var permissions = permission_view(app.permissions, 'Permissions', '');
  var host_permissions = permission_view(app.hostPermissions, 'Host Permissions', '');
  var bar = option_bar(app);
  var classes = app_classes(app.enabled);
  var element = document.createElement("section");
  element.setAttribute('class', classes);
  var element_id = app_element_id(app.id)
  element.setAttribute('id', element_id);
  element.appendChild(heading);
  element.appendChild(description);
  element.appendChild(warnings);
  element.appendChild(permissions);
  element.appendChild(host_permissions);
  element.appendChild(bar);
  return element;
}

function enable_toggle(id) {
  var enable = enable_link(id);
  var disable = disable_link(id);
  var toggle = document.createElement("span");
  toggle.appendChild(enable)
  toggle.appendChild(disable)
  return toggle;
}

function option_bar(app) {
  var id = app.id;
  var uninstall = uninstall_link(id);
  var toggle = enable_toggle(id);
  var store = store_link(id);
  var bar = document.createElement("p");
  bar.setAttribute('class', 'bottombar');
  bar.appendChild(uninstall);
  bar.appendChild(toggle);
  bar.appendChild(store);
  return bar;
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

function enabled_update(info) {
  var id = info.id;
  var element_id = app_element_id(id)
  var element = document.getElementById(element_id);
  var classes = app_classes(info.enabled);
  element.setAttribute('class', classes);
}

function app_element_id(app_id) {
  var element_id = 'app-' + app_id;
  return element_id;
}

function remove_app_element(id) {
  var element_id = app_element_id(id)
  var obsolete = document.getElementById(element_id);
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
  chrome.management.onEnabled.addListener(enabled_update);
  chrome.management.onDisabled.addListener(enabled_update);
  refresh_page();
}

