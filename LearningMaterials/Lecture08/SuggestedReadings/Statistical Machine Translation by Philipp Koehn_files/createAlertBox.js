//globals window
var AOP = AOP || {};

AOP.createAlertBox = (function ($) {
  var alertSettings = {
    error: {
      boxClass: 'alert',
      messageClass: 'alert-danger'
    },
    warn: {
      boxClass: 'warning',
      messageClass: 'alert-danger'
    },
    info: {
      boxClass: 'info',
      messageClass: 'alert'
    },
    success: {
      boxClass: 'success',
      messageClass: 'alert'
    }
  };

  var defaultOptions = {
    alertElement: '#ajaxMessages',
    alertType: 'error',
    closeAfter: 3000,
    scroll: true
  };

  return function (message, opts) {

    if (message) {
      opts = $.extend(defaultOptions, opts);
      var alertElement = $(opts.alertElement);
      var alertBox = $('<div data-alert class="alert-box ' + alertSettings[opts.alertType].boxClass + '"><div class="alert ' + alertSettings[opts.alertType].messageClass + '">' + message + '</div><a href="#" class="close" tabindex="1">&times;</a></div>');
      alertElement.append(alertBox).foundation();
      if (opts.scroll) {
        var scrollOffset = $(alertBox).offset().top - 100;
        $('html, body').animate({scrollTop: scrollOffset}, 'fast');
      }
      if (opts.autoClose) {
        setTimeout(function () {
          alertBox.hide('fast', function () {
            alertBox.remove();
          });
        }, opts.closeAfter);
      }
    }
  };
})(jQuery);
