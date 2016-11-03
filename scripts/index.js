var keepButtonDisabled = false;
function enableButton() {
  $('#button-submit').removeAttr('disabled');
  keepButtonDisabled = false;
}
$(document).ready(function() {
  //button click event
  $('#button-submit').click(function() {
    $.post("/submit",
    {
      url: $("#input-url").val()
    },
    function(data, status) {
      $('#div-output').html(data);
    });
    $('#button-submit').prop('disabled', true);
    keepButtonDisabled = true;
    setTimeout('enableButton()', 2000);
  });
  //input change event
  $('#input-url').on('change keyup paste', function() {
    if ($('#button-submit').prop('disabled') == true && !keepButtonDisabled) {
      enableButton();
    }
  });
  //input key press event
  $('#input-url').keypress(function(e) {
    if (e.keyCode == 13) {
      $('#button-submit').trigger('click');
    }
  });
});
