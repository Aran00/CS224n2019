var AOP = AOP || {};
var modalSelectorString = 'a.delete-modal, a[data-reveal-id], a[class*=export-citation], a[class*=ip-address]';

var qtipSelectorString = 'a[classG*="hasTooltipCustom"], a[data-hasqtip], a[data-qtip-event]';

var tooltipIconSelectorString = 'a.tooltip-icon';

/* jshint ignore:start */
AOP.toolTipCloseLinkHtml = '<p> \
  <a style="float: right; color:#0072cf;" \
    id="tooltip-close-link" href="#" \
    onclick="$(AOP.lastElementBeforeRevealModal).focus(); return false;"> \
      <span class="custom-tooltip-button-remove"></span> \
  </a> \
</p>';
/* jshint ignore:end */

AOP.lastElementBeforeRevealModal = '';

AOP.addUsibilityAttributes = function (elements) {

  if (elements.length === 0) {
    return false;
  }

  elements.each(function (index, element) {
    // Don't apply the role/tooltip attribute, on any element that doesn't want it.
    if (!$(element).attr('data-no-role')) {
      $(element).attr('role', 'tooltip');
    }
    var elementText = $.trim($(element).text());
    // Only update aria-labels that do not already have a value set in the partial
    if (elementText && !$(element).attr('aria-label')) {
      $(element).attr('aria-label', elementText.toLowerCase());
    }
  });
};

AOP.addUsibilityAttributesToModals = function () {
  var modals = $(modalSelectorString);
  AOP.addUsibilityAttributes(modals);
};

AOP.addUsibilityAttributesToTooltips = function () {
  var tooltips = $(qtipSelectorString);
  AOP.addUsibilityAttributes(tooltips);
};

AOP.enableKeyboardAccessInQtipTooltip = function () {

  setTimeout(function () {
    AOP.enableKeyboardAccess($('.qtip-content'));
  }, 300);
};

AOP.attatchCloseLinkToQtip = function (qtipAPI) {
  setTimeout(function () {
    var closeLink = $('.qtip-content').find('#tooltip-close-link');
    if (closeLink.length === 0) {
      return false;
    }
    closeLink.on('click', function (e) {
      e.preventDefault();
      qtipAPI.toggle(false);
      $(AOP.lastElementBeforeRevealModal).focus();
    });
    closeLink.on('keydown', function (e) {
      var keyPressed = e.keyCode || e.which;
      var enterKey = 13;

      if (keyPressed === enterKey) {
        e.preventDefault();
        qtipAPI.toggle(false);
        $(AOP.lastElementBeforeRevealModal).focus();
      }
    });
  }, 300);
};

AOP.enableKeyboardAccess = function ($DOMElement) {

  var tabAbles = $DOMElement.find('select:visible, input:visible, textarea:visible, button:visible, a.button:visible').filter(function (index, element) {
    var $element = $(element);
    var elementClass = $element.attr('class');
    var elementType = $element.attr('type');
    var isCloseModalIcon = elementClass && elementClass.split(' ').indexOf('close-reveal-modal') > -1;
    var isHidden = elementType && elementType.split(' ').indexOf('hidden') > -1;
    return isHidden !== true && isCloseModalIcon !== true;
  });

  var firstTabAble = tabAbles.first();
  var lastTabAble = tabAbles.last();

  firstTabAble.focus();

  lastTabAble.on('keydown', function (e) {
    var keyPressed = e.keyCode || e.which;
    if (keyPressed === 9 && !e.shiftKey) {
      e.preventDefault();
      var firstTabAbleDisiplayed = firstTabAble.is(':visible');
      if (firstTabAbleDisiplayed) {
        firstTabAble.focus();
        return true;
      }
      if (tabAbles.length >= 2) {
        tabAbles[1].focus();
      }
      return true;
    }
  });
};

$(document).ready(function () {
  AOP.addUsibilityAttributesToModals();
  AOP.addUsibilityAttributesToTooltips();
});


$(document).on('keydown', qtipSelectorString + ', ' + modalSelectorString + ', ' + tooltipIconSelectorString, function (e) {
  var keyPressed = e.keyCode || e.which;
  var enterKey = 13;
  if (keyPressed === enterKey) {
    AOP.lastElementBeforeRevealModal = e.target;
  }
});

$(document).on('closed.fndtn.reveal', function () {
  $(AOP.lastElementBeforeRevealModal).focus();
});

$(document).on('opened.fndtn.reveal', '[data-reveal], [data-reveal-id]', function () {
  AOP.enableKeyboardAccess($(this));
});

$(document).on('click', 'input[type="checkbox"]', function (e) {
  $(e.target).next('span').css('outline', 'none');
});

$(document).on('keydown', 'input[type="checkbox"]', function (e) {
  var keyPressed = e.keyCode || e.which;
  var tabKey = 9;

  if (keyPressed === tabKey) {
    $(e.target).focus(function () {
      $(this).next('span').css('outline', 'blue auto 1px');
    });
    $(e.target).blur(function () {
      $(this).next('span').css('outline', 'none');
    });
  }
});

$(document).on('keydown', tooltipIconSelectorString, function (e) {
  var keyPressed = e.keyCode || e.which;
  var enterKey = 13;
  var $tooltipIcon = $(this);
  var toolTipContentId = $tooltipIcon.attr('aria-controls');

  if (keyPressed === enterKey) {
    setTimeout(function () {
      var $dataDropdownContent = $('#' + toolTipContentId);
      var contentHTML = $dataDropdownContent.html();
      var closeLinkExists = $dataDropdownContent.find('a#tooltip-close-link');

      if (closeLinkExists.length === 0) {
        $dataDropdownContent.html(
          AOP.toolTipCloseLinkHtml +
          contentHTML
        );
      }

      AOP.enableKeyboardAccess($('[data-dropdown-content]'));
    }, 200);
  }
});
