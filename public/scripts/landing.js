$(document).ready(function(){
  $("#signup label, #signin label").inFieldLabels();
});

maydah.on("login", function() {
	window.location = "/";
});

maydah.on("loginFailed", function() {
	alert("login failed. sad face.");
});

function submitLoginForm() {
	var email = $("#login-email").val();
	var password = $("#login-password").val();
	maydah.login(email, password);
}
