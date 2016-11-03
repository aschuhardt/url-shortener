var disableBtn = false;
var canEntr = true;
function enableButton() {
  $('#button-submit').removeAttr('disabled');
  disableBtn = false;
}
function enableEnter() {
  canEntr = true;
}
$(document).ready(function() {
  //button click event
  $('#button-submit').click(function() {
    var url = $("#input-url").val();
    if (!/^\s*$/.test(url)) {
      $.post("/submit",
      {
        url: $("#input-url").val()
      },
      function(data, status) {
        $('#div-output').html(data);
      });
      $('#button-submit').prop('disabled', true);
      disableBtn = true;
      setTimeout('enableButton()', 2000);
    }
  });
  //input change event
  $('#input-url').on('change keyup paste', function() {
    if ($('#button-submit').prop('disabled') == true && !disableBtn) {
      enableButton();
    }
  });
  //input key press event
  $('#input-url').keypress(function(e) {
    if (e.keyCode == 13 && canEntr) {
      $('#button-submit').trigger('click');
      canEntr = false;
    }
  });
  $('#input-url').keyup(function(e) {
    if (e.keyCode == 13 && !canEntr) {
      setTimeout('enableEnter()', 2000);
    }
  });
});
