
function print(content) {
  var body = document.getElementsByTagName('body')[0];
  body.innerHTML += content;
}
function pprint(name, per, content) {
  print('<h2>' + name + '</h2>');
  console.log(content)
  print('<p>' + per + '</p>');
  print('<p>' + content + '</p>');
}

function infos(result) {
  print('<h1>Permissions</h1>')
  for(var i in result) {
    var info = result[i];
    var id = info.id;
    var name = info.name;
    var permissions = info.permissions;
    var stuff = chrome.management.getPermissionWarningsById(id);
    console.log(stuff);
    print('<h2>' + name + ' (' + id + ')</h2>')
    print('<p>' + permissions + '</p>');
    print('<p>' + stuff + '</p>');
  }
}
window.onload = function() {
  chrome.management.getAll(infos)
}

