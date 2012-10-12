function main() {
  this.launcher = document.createElement("a");
  this.launcher.target = "_blank";
  this.launcher.style.visibility = "hidden";
  document.getElementsByTagName("head")[0].appendChild(this.launcher);

  main_this = this;

  var images = document.getElementsByTagName('img'); 
  for(var i = 0; i < images.length; i++) {
    var img = images[i];
    if (img.getAttribute("class") == "_screen") {
      img.onmouseover = function() {
        this.setAttribute("original_height", this.height);
        this.style.height = this.height * 2;
      };
      img.onmouseout = function() {
        this.style.height = this.getAttribute("original_height");
      };
    }
  }
  var buttons = document.getElementsByTagName('button'); 
  for(var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    if (button.getAttribute("class") == "run") {
      button.onclick = function() {
        main_this.launcher.href = "../index.html?file=" + this.name;
        launcher.click();
      };
    }
  }
}
