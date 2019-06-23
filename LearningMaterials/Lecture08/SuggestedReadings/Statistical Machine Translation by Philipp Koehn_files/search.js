/* global createAlertBox, confirmModal */

$.fn.insertAt = function (index, element) {
  var lastIndex = this.children().size();
  if (index < 0) {
    index = Math.max(0, lastIndex + 1 + index);
  }
  this.append(element);
  if (index < lastIndex) {
    this.children().eq(index).before(this.children().last());
  }
  return this;
};

var AOP = AOP || {};

// These methods and properties capture facet & text filter changes, format an appropriate message, then report the
// message to the accessible user using a hidden div with an ARIA-LIVE element attribute.
// Messages are in the form "Your search results have been updated: <option> - <value>" OR
// Messages are in the form "Your search results have been updated: <option> - filter removed" OR
AOP.accessibilitySearchAlert = {
  baseMessage: 'Your search results have been updated: ',
  accessibleAlertClassName: '.search-results-listing .accessible-alert',
  accessibleAlertMessage: '',
  facetTypeNameMappings: {
    'type': 'Content type',
    'date': 'Publication date'
  },
  /**
   * Set the alert message for the last tag selection or removal
   * @param tagText
   * @param opts
   */
  setTagMessage: function (tagText, opts) {
    if (!tagText) {
      return;
    }
    opts = opts || {};
    opts.removed = opts.removed || false;
    this.accessibleAlertMessage = this.baseMessage + 'tags - ' +
      tagText +
      (opts.removed ? ' filter removed' : '');
  },
  /**
   * Set the alert message for the last sort option
   * @param sortOptionText
   */
  setSortOptionMessage: function (sortOptionText) {
    if (!sortOptionText) {
      return;
    }
    this.accessibleAlertMessage = this.baseMessage + 'sorted by ' + sortOptionText;
  },
  /**
   * Set the alert message for last pagination change
   * @param pageNumber
   */
  setPaginationOptionMessage: function (pageNumber) {
    this.accessibleAlertMessage = this.baseMessage + 'showing page ' + String(pageNumber);
  },
  /**
   * Set the alert message for the last facet change or removal
   * @param el
   */
  setFacetMessage: function (el) {
    el = $(el);
    // Get parent type for action, eg, Content type, date, access
    var parentType = el.closest('ul').attr('data-type-legend');
    var currentFacetLegend = el.attr('data-legend');
    if (!parentType || typeof parentType !== 'string' || !currentFacetLegend) {
      return;
    }
    // Set a nicely formatted version or fallback to standard legend
    var parentTypeDisplay = this.facetTypeNameMappings[parentType.toLowerCase()];
    parentType = parentTypeDisplay ? parentTypeDisplay : parentType;
    // Set message
    this.accessibleAlertMessage = this.baseMessage +
      parentType + ' - ' +
      currentFacetLegend +
      (!el.is(':checked') ? ' filter removed' : '');
  },
  /**
   * Set the alert message for the removed filter text
   * @param filterRemovedText
   */
  setTextFilterRemovedMessage: function (filterRemovedText) {
    this.accessibleAlertMessage = this.baseMessage +
      filterRemovedText + ' filter removed';
  },
  /**
   * Use to this handle filters with a single input,
   * like the author option.
   * @param input
   */
  handleSingleFilterChange: function (input) {
    var filterValue = $(input).val();
    var searchType = $(input).attr('data-filter-label') || $(input).attr('data-sr-label');
    searchType += (!filterValue ? ' filter removed' : ' - ' + filterValue);
    this.accessibleAlertMessage = this.baseMessage + searchType;
  },
  /**
   * Use to this handle filters with multiple inputs,
   * like the from/to year option.
   * @param $inputs
   */
  handleMultipleFilterChange: function ($inputs) {
    var filterValue = '';
    var updatedTypes = [];
    var searchType = '';
    var parentType = '';
    $.each($inputs, function (index, input) {
      filterValue = $(input).val();
      searchType = $(input).attr('data-filter-label');
      // Track the outer parent type. Eg, 'from year' would have the parent of
      // 'Publication date'
      parentType = searchType;
      if (typeof searchType === 'string' && searchType.toLowerCase().indexOf('published') !== -1) {
        parentType = 'Publication date'
      }
      // Add filters with a value
      if (filterValue) {
        updatedTypes.push(searchType + ' - ' + filterValue);
      }
    });
    // Either show filters applied OR if none were found (meaning the user has submitted
    // a blank value for each), use the Parent type and show the filter is removed.
    this.accessibleAlertMessage = this.baseMessage +
      (!updatedTypes.length ?
        parentType + ' filter removed' :
        updatedTypes.join(' and ')
      );
  },
  /**
   * Set the alert message for the last text filter (author or publication year range)
   * @param el
   */
  setTextFilterMessage: function (el) {
    el = $(el);
    // Gather an inputs with filter data - there can be more than one.
    var $inputs = el.closest('.actions').find('input[type=text]');
    if (!$inputs.length) {
      return;
    }
    // Handle single input text filter, like Author.
    if ($inputs.length === 1) {
      this.handleSingleFilterChange($inputs[0]);
      return;
    }
    // Handle multiple field text filter, like from/to date range.
    this.handleMultipleFilterChange($inputs);
  },
  /**
   * Set the alert message for showing more/less facets
   * @param input
   */
  handleMoreLessMessage: function (input) {
    this.accessibleAlertMessage = input;
    this.setAccessibilityAlertDescription();
  },
  /**
   * Clear the accessible message
   */
  resetAccessibilityAlertDescription: function () {
    $(this.accessibleAlertClassName).html('');
  },
  /**
   * Set the on screen accessible alert message
   */
  setAccessibilityAlertDescription: function () {
    // Set the message
    $(this.accessibleAlertClassName).html(this.accessibleAlertMessage);
    // Clear last option
    this.accessibleAlertMessage = '';
  }
};

AOP.search = function (opts) {
  var loginModal = $('#login-modal');

  function mapToSearchArray(qs) {
    var qsParamsArray = [];
    for (var key in qs) {
      if (qs.hasOwnProperty(key) && qs[key]) {
        qsParamsArray.push({
          term: key,
          value: qs[key]
        });
      }
    }
    return qsParamsArray;
  }

  function buildScopeProductListingParam() {
    var el = $('#scopeProductListing');
    if (el.length) {
      return {
        term: 'scopeProductListing',
        value: el.data('productid'),
        displayName: el.data('legend')
      };
    }
    return null;
  }

  function getLegendUsingJquery(productIds) {
    if (!productIds) {
      return null;
    }

    var legends = productIds.split(',').map(function (productId) {
      var selector = 'input[data-productId="' + productId + '"]';
      return $(selector).data('legend');
    }).filter(function (value) {
      if (value) {
        return value;
      }
    }).join('##');

    return legends;
  }

  function hasGotSearchWithinIds(searchTerms) {
    return searchTerms.filter(function (searchTerm) {
      return searchTerm.term === 'searchWithinIds';
    }).length;
  }

  function mapQueryStringParams(paramsArray, getLegendFn) {
    var aggRegEx = /^(aggs\[(.*?)\]|searchWithinIds)/m;
    return paramsArray.map(function (param) {
      var regExResult = aggRegEx.exec(param.term);
      if (regExResult && regExResult.length > 0) {
        var legend = getLegendFn(param.value);
        if (legend) {
          param.displayName = legend;
        }
      }
      return param;
    });
  }

  function getCurrentPath() {
    return window.location.pathname + window.location.search;
  }

  var self = this;

  var _endpoint = AOP.baseUrl + '/services/aop-cambridge-core/search',
    _saveEndpoint = AOP.baseUrl + '/services/aop-cambridge-core/search/save',
    _saveForLoginEndpoint = AOP.baseUrl + '/services/aop-cambridge-core/search/save-for-login',
    _searchUrl = AOP.baseUrl + '/search',
    _actionsContainer = '#actionsContainer',
    _resultsContainer = '.search-results-listing .results',
    _resultsContainerOuter = '.search-results-listing',
    _itemContainer = '.representation.overview.search',
    _resultCount = '.result-number',
    _searchTermDisplay = '.search-terms',
    _refineSearchForm = '.search-refine-form',
    _searchDescriptionContainer = '#search-description',
    _searchResultActions = '.save-search, .search-actions select',
    _query = '',
    _self = this;

  opts = opts || {};

  //Initialise config
  var _conf = {
    endpoint: opts.endpoint || _endpoint,
    actionsContainer: opts.filterForm || _actionsContainer,
    resultsContainer: opts.resultsContainer || _resultsContainer,
    resultsContainerOuter: opts.resultsContainerOuter || _resultsContainerOuter,
    resultCount: opts.resultCount || _resultCount,
    query: opts.query || _query,
    refineSearchForm: opts.refineSearchForm || _refineSearchForm,
    searchTermDisplay: opts.searchTermDisplay || _searchTermDisplay,
    searchDescriptionContainer: opts.searchDescriptionContainer || _searchDescriptionContainer,
    searchResultActions: opts.searchResultActions || _searchResultActions
  };

  var _handlers = {
    tags: function tagsHandler(el) {
      var handlerBody = el;

      $(handlerBody).find('[data-filter-label="Keyword"]').off('click').on('click', function (e) {
        $(this).remove();
        self.runSearch();
        e.preventDefault();
      });

      var input = $(handlerBody).find('input[type="text"]').first();

      $(input).off('keypress').on('keypress', function (e) {
        if (e.which === 13) {
          e.preventDefault();
        }
      });

      function initTagEvents() {
        $('[data-search-param="filters[keywords]"]').each(function () {
          $(this).off('click').on('click', function (e) {
            AOP.accessibilitySearchAlert.setTagMessage($(this).attr('value'), {
              removed: true
            });
            $(this).remove();
            self.runSearch();
            e.preventDefault();
          });
        });
      }

      initTagEvents();

      var moreMatchesText = 'More matches available, keep typing to refine';

      $(input).devbridgeAutocomplete({
        triggerSelectOnValidInput: false,
        lookup: function (query, callback) {
          var payload = {
            input: query
          };

          $.get(AOP.baseUrl + '/services/aop-cambridge-core/search/keywords', payload, function (res) {

            return callback({
              suggestions: res
            });
          });
        },
        onSelect: function (suggestion) {
          var keyword = suggestion.data;
          var el = this;

          AOP.accessibilitySearchAlert.setTagMessage(keyword);

          if ($('li[data-search-param="filters[keywords]"][value="' + keyword + '"]').size() === 0) {
            var a = $('<a></a>');

            $(a).html('<a href="#" class="icon delete"></a>' + keyword);
            var li = $('<li ></li>')
              .append(a)
              .attr('data-filter-label', 'Keyword:')
              .attr('data-search-maintain-state', true)
              .attr('data-search-param', 'filters[keywords]')
              .attr('value', keyword)
              .attr('placeholder', 'e.g. my tag');


            $(handlerBody).find('ul.keywords').append(li);
            initTagEvents();
            $(el).val('');
            self.runSearch();
          }
        }
      });
    }
  };

  this.getSearchData = function () {
    var aggregations = {};

    $(_conf.actionsContainer + ' [data-agg="true"]').each(function () {
      var key = $(this).data('aggKey');
      if (key) {
        aggregations[key] = [];

        var active = $(this).find('[active="true"]');
        active.each(function () {
          aggregations[key].push($(this).data('aggOption'));
        });
      }
    });

    var q = [];

    if (_conf.query) {
      q.push({
        name: 'q',
        value: _conf.query
      });
    }

    if ($('select.sort-by').size()) {
      q.push({
        name: 'sort',
        value: $('select.sort-by').val()
      });
    }

    var queryKeys = [];
    for (var key in aggregations) {
      if (aggregations.hasOwnProperty(key)) {
        q.push({
          name: 'aggs[' + key + '][filters]',
          value: aggregations[key].join(',')
        });
      }
    }

    q.forEach(function (queryElement, index) {
      var emptyProductDateFilters = queryElement.name === 'aggs[productDate][filters]' && queryElement.value === '';
    });

    $(_conf.actionsContainer + ' [data-agg="true"]').each(function () {
      var key = $(this).data('aggKey');
      if (key) {
        aggregations[key] = [];

        var active = $(this).find('[active="true"]');
        active.each(function () {
          aggregations[key].push($(this).data('aggOption'));
        });
      }
    });

    return q;
  };

  this.searchUi = {
    fadeOut: function () {
      $(_conf.resultsContainer).fadeTo(100, 0.2);
      $(_conf.resultCount).parent().fadeTo(100, 0.2);
      $(_conf.searchDescriptionContainer).fadeTo(100, 0.2);
      $(_conf.searchResultActions).prop('disabled', true);
    },
    fadeIn: function () {
      $(_conf.resultsContainer).fadeTo(100, 1);
      $(_conf.resultCount).parent().fadeTo(100, 1);
      $(_conf.searchDescriptionContainer).fadeTo(100, 1);
      $(_conf.searchResultActions).prop('disabled', false);
    },
    scrollToTopOfResults: function () {
      var topOffset = $(_conf.resultsContainerOuter).offset().top;
      var bodyTopOffset = $('body').scrollTop();
      var htmlTopOffset = $('html').scrollTop(); // firefox support
      var currentOffset = bodyTopOffset || htmlTopOffset;

      if (topOffset && (currentOffset > topOffset)) {
        $('html, body').animate({
          scrollTop: topOffset
        }, 300);
      }
    }
  };

  this.logSearchEvent = function (payload, callback) {
    payload.eventCode = 'SE-AD';
    payload.usedIdentities = [];
    payload.eventContext = window.location.href;
    payload.searchScope = 'SITE';
    payload.referringURL = window.location.href;

    if ($('[data-search-within-id]').size()) {
      payload.searchScope = 'PRODUCT';
      payload.productId = $('[data-search-within-id]').first().data('searchWithinId');
    }

    $.cupEvent.dispatchEvent(payload, function (err, res) {
      if (typeof callback === 'function') {
        callback(err, res);
      }
    });
  };

  this.runSearch = function (opts) {
    opts = opts || {};

    AOP.accessibilitySearchAlert.resetAccessibilityAlertDescription();

    var validated = true;
    $('[data-validate-regex]').each(function () {
      if ($(this).val()) {
        var regex = new RegExp($(this).data('validateRegex'));
        if (!$(this).val().match(regex)) {
          var label = $(this).data('validateMessageName');
          if (!label.length) {
            label = $(this).data('filterLabel');
          }
          createAlertBox(null, $('#ajaxMessages'), 'alert', label + ' is not valid.');
          validated = false;
        }
      }
    });

    if (!validated) {
      return false;
    }

    _self.searchUi.fadeOut();
    _self.searchUi.scrollToTopOfResults();

    var q = _self.getSearchData();

    //Set the page number over the top of our current page, if it exists, else add it for the first time.
    if (opts.pageNum) {
      var foundPageNum = false;
      for (var key in q) {
        if (q[key].name === 'pageNum') {
          q[key] = opts.pageNum;
          break;
        }
      }
      if (!foundPageNum) {
        q.push({
          name: 'pageNum',
          value: opts.pageNum,
          persistState: true
        });
      }
    }

    var additionalParams = [];
    $('[data-search-param]').each(function () {
      if ($(this).data('searchmaintainstate') === false) {
        additionalParams.push({
          name: $(this).data('searchParam'),
          value: $(this).val() || $(this).attr('value')
        });
      } else {
        q.push({
          name: $(this).data('searchParam'),
          value: $(this).val() || $(this).attr('value')
        });
      }
    });

    var ajaxProps = additionalParams.concat(q);

    if (this.request && this.request.readystate !== 4) {
      this.request.abort();
    }

    _self.logSearchEvent({
      searchString: $(_conf.refineSearchForm).find('input[name="q"]').val()
    });

    var enableMultiLingual = AOP.isMultiLingualEnabledPage(window.location.href);
    ajaxProps.push({
      name: 'enableMultiLingual',
      value: enableMultiLingual
    });

    this.request = $.get(_endpoint, ajaxProps, function (res) {
      /*jshint camelcase: false */
      res.sanitisedPayload = res.sanitisedPayload || {};
      _conf.query = res.sanitisedPayload.q || '';

      var bucketKey;
      $('.loadmoreajaxloader').css('display', 'none');
      //Send the latest query params for this result set to the URL
      //Set state object data "productSearch: true", this allows us check for this variable
      //when an "popstate" event is fired, and then only reload the page, if the user has click back to
      //the search results page. This is to get around issues with Safari version <=8 and earlier versions of Chrome
      //where the pop state will fire on initial page load and get itself into the reload loop.

      var usedParams = q.filter(function (queryParameter) {
        return queryParameter.value !== '';
      });
      window.history.pushState({
        productSearch: true
      }, document.title, location.protocol + '//' + location.host + location.pathname + '?' + $.param(usedParams));

      if (res.aggs) {
        for (var key in res.aggs) {
          //All aggregations are nested, hence seeing key twice.
          var aggregation = res.aggs[key][key];

          var container = $('[data-agg-key="' + key + '"]');

          if (!container) {
            continue;
          }

          var existingBuckets = [];

          $(container).find('[data-agg-option]').each(function () {
            existingBuckets.push($(this));
          }); // jshint ignore:line

          var aggPos = 0;

          //Track the number of buckets with documents inside, we'll later use this to hide aggregations which have no
          // active buckets.
          var populatedBucketCount = 0;

          for (bucketKey in aggregation.buckets) {

            var bucket = aggregation.buckets[bucketKey];
            populatedBucketCount++;

            if (bucket.key === 'default') {
              continue;
            }

            if ($(container).find('[data-agg-container="' + bucket.key + '"]').size()) {
              //update the bucket
              $(container).find('[data-agg-container="' + bucket.key + '"] [data-agg-total-for="' + bucket.key + '"]').html(' (' + bucket.doc_count + ')');
              var updatedFacet = $(container).find('[data-agg-container="' + bucket.key + '"]').detach();
              $(container).insertAt(aggPos, updatedFacet);
            } else {
              //insert the bucket
              var gaString = (AOP.gaEvents && AOP.gaEvents.search) ? AOP.gaEvents.search.getGaData(key, bucket) : '';
              var newBucket = $('' +
                '<li data-agg-container="' + bucket.key + '">' +
                '<label>' +
                '<input ' +
                'type="checkbox" ' +
                'autocomplete="off" ' +
                'data-agg-option="' + bucket.key + '" ' +
                'data-legend="' + (bucket.label ? bucket.label : bucket.key) + '" ' +
                'data-productId="' + bucket.productId + '" ' +
                'data-count="' + bucket.doc_count + '" ' +
                //add facet ga tracking data string
                gaString +
                'value="' + bucket.key + '"> ' +
                '<span class="legend ajax-option">' + (bucket.label ? bucket.label : bucket.key) + '</span>' +
                '<span class="total" data-agg-total-for="' + bucket.key + '"> (' + bucket.doc_count + ')</span>' +
                '</label>' +
                '</li>');

              $(container).insertAt(aggPos, newBucket);
            }
            aggPos++;
          }

          for (var i in existingBuckets) {
            var found = false;
            var existingKey = existingBuckets[i].data('aggOption');

            for (bucketKey in aggregation.buckets) {
              if (aggregation.buckets[bucketKey].key === existingKey) {
                found = true;
                break;
              }
            }

            if (!found) {
              $(container).find('[data-agg-container="' + existingKey + '"]').remove();
            }
          }

          if (populatedBucketCount === 0) {
            $('[data-agg="' + key + '"]').parent().addClass('hide').removeClass('show');
          } else {
            $('[data-agg="' + key + '"]').parent().removeClass('hide').addClass('show');
          }

          if (populatedBucketCount > 4) {
            $('[data-agg="' + key + '"]').parent().find('.show-all').removeClass('hide');
          } else {
            $('[data-agg="' + key + '"]').parent().find('.show-all').addClass('hide');
          }


          if (aggregation.moreAvailable === true) {
            $('[data-agg="' + key + '"] .moreBucketsFound').removeClass('hide');
          } else {
            $('[data-agg="' + key + '"] .moreBucketsFound').addClass('hide');
          }
        }
      }

      $(_conf.resultsContainer).html(res.results);
      $(_conf.resultCount).html(res.resultCount || 0);

      //reinitialise cup events.
      //unable to focus on resultsContainer as it appears to be stale at this moment in the routine.
      $(document).cupEvent();

      if (_conf.query.length > 0) {
        $(_conf.searchTermDisplay).html(' for <span class="typed-search">' + _conf.query + '</span>').show();
        $(_conf.searchTermDisplay).show();
      } else {
        $(_conf.searchTermDisplay).hide();
        $(_conf.searchTerms).html('');
      }

      _self._init(opts, res.sanitisedPayload);
      _self._postAjaxInit();
      _self.searchUi.fadeIn();
      AOP.accessibilitySearchAlert.setAccessibilityAlertDescription();

      //send GA events for pub dates
      if (AOP.gaEvents && AOP.gaEvents.search) {
        AOP.gaEvents.search.trackPubDates();
      }

    }).error(function (res, reason) {
      //Aborts will happen when subsequent requests are being fired. Under this scenario we want to do nothing.
      if (reason && reason === 'abort') {
        return;
      }

      var message = $('<h5>')
        .addClass('heading_10 text-center margin-top')
        .html('There has been a problem loading your listing.<br /><p class="paragraph_05">Please try again</p><!-- ' + res.responseText + ' --><hr />');

      $(_conf.resultsContainer).html(message);
      _self._init(opts, res.sanitisedPayload);
      _self._postAjaxInit();
      _self.searchUi.fadeIn();

    });
  };

  // Check if the user is logged in, show the login modal if not.
  this.isLoggedIn = function () {
    var saveButton = $('.save-search');
    return !saveButton.hasClass('requires-login');
  };

  this.showLoginModal = function showLoginModal() {
    loginModal.find('.message')
      .text('Please log in to your Cambridge Core account in order to save this search.');
    $('.qtip').hide();
    loginModal.foundation('reveal', 'open');
  };

  this.saveSearch = function () {
    // Get the current search URI
    var qsParamsArray = mapToSearchArray(AOP.parseQuerystring(window.location.search));
    // and map them
    var searchTerms = mapQueryStringParams(qsParamsArray, getLegendUsingJquery);

    if (!hasGotSearchWithinIds(searchTerms)) {
      var param = buildScopeProductListingParam();
      if (param) {
        searchTerms.push(param);
      }
    }


    if (!searchTerms) {
      return false;
    }

    // also add window locatio path becuase could be search of product listing

    var saveModel = {
      searchTerms: searchTerms,
      pathname: window.location.pathname,
      redirectUrl: getCurrentPath()
    };

    var payload = {
      saveModel: JSON.stringify(saveModel),
      _csrf: $('input[name="_csrf"]').val()
    };

    // console.log('search saveModel', saveModel);
    // return false;

    if (_self.isLoggedIn()) {
      $.post(_saveEndpoint, payload, function (res) {
        if (!res.success) {
          createAlertBox(null, $('#ajaxMessages'), 'alert', res.message);
        } else {
          createAlertBox(null, $('#ajaxMessages'), 'info', res.message);
        }
      });
    } else {
      // User is not logged in.
      // Temporarily store the current search so we can save it when they log in.
      $.post(_saveForLoginEndpoint, payload, function (res) {
        if (!res.success) {
          createAlertBox(null, $('#ajaxMessages'), 'alert', 'Error saving search');
        } else {
          _self.showLoginModal();
        }
      });
    }
  };

  this.setAccessibilityOptions = function () {
    // For each item, get the formatted title and append the hidden accessibility element.
    $(_resultsContainerOuter + ' ' + _itemContainer).each(function () {
      var $itemContainer = $(this);
      var productTitle = $itemContainer.find('.title a').text();
      $itemContainer
        .find('.product-listing-with-inputs-input')
        .append('<span class="show-for-sr">Select ' + productTitle.trim() + '</span>');
    });
  };

  //only this things we want to run after ajax - not after page load
  this._postAjaxInit = function () {
    AOP.styleInputElements();
    AOP.accordionTextSwitch();
    AOP.initAltMetric();
    AOP.loadQtip();

    if (AOP.mathjax && AOP.mathjax.refresh) {
      AOP.mathjax.refresh();
    }

    //if Kona is present, reinitialise those events too.
    if (typeof AOP.aopKonaKart !== 'undefined') {
      AOP.aopKonaKart.attachEvents();
    }
  };

  this._init = function (opts, sanitisedPayload) {
    var self = this;

    var activeFacets = $(_conf.actionsContainer).find('[active="true"]');

    var searchDescriptionContainer = $(_conf.searchDescriptionContainer);
    searchDescriptionContainer.empty();

    $('[data-search-request-handler]').each(function () {
      var key = $(this).data('searchRequestHandler');
      var block = this;
      if (_handlers.hasOwnProperty(key)) {
        _handlers[key](block);
      }
    });

    function getByPath(obj, path) {
      if (!obj || typeof path !== 'string') {
        return false;
      }
      path = path.split('.');

      var baseObj = obj;
      for (var i = 0; i < path.length; i++) {
        if (baseObj[path[i]]) {
          baseObj = baseObj[path[i]];
        } else {
          return null;
        }
      }
      return baseObj;
    }

    function bracketsToDotNotation(bracketNotationString) {
      var path = bracketNotationString.split('[');
      $.each(path, function (i, el) {
        path[i] = el.replace(']', '');
      });
      path = path.join('.');
      return path;
    }

    function findValueInArray(arr, domValue) {
      var value = null;
      var index = arr.indexOf(domValue);
      if (index > -1) {
        value = arr[index];
      }

      return value;
    }

    // XSS CLEANUP
    $('[data-filter-label]').each(function () {

      var $targetEl = $(this);

      var elSearchParam = $targetEl.data('searchParam');
      var elFilterLabel = $targetEl.data('filterLabel');
      var domValue = $targetEl.attr('value') || $(this).val();

      var filterPath = bracketsToDotNotation(elSearchParam);

      var sanitisedValue = getByPath(sanitisedPayload, filterPath);
      var value = sanitisedValue || domValue;
      var displayText = $targetEl.data('displayText') || value;

      if (Array.isArray(value)) {
        value = findValueInArray(value, domValue);
      }

      if (value) {
        // optional rewriting of input value to sanitise in all parts of UI
        // $targetEl.val(value);

        var facetLabel = $('<a href="#" class="margin-right-small radius label facet"></a>');
        facetLabel.html('<span class="legend">' + elFilterLabel + ' ' + displayText + '</span> &#215;');
        facetLabel.click(function (e) {
          e.preventDefault();
          AOP.accessibilitySearchAlert.setTextFilterRemovedMessage(elFilterLabel);
          if ($targetEl.is('input')) {
            $targetEl.val('');
            $targetEl.attr('value', '');
          } else {
            $targetEl.remove();
          }
          self.runSearch();
        });

        searchDescriptionContainer.append(facetLabel);
      }
    });

    activeFacets.each(function () {

      var facet = {
        type: $(this).closest('[data-type-legend]').data('type-legend'),
        legend: $(this).data('legend'),
        key: $(this).attr('value') || $(this).val(),
        count: $(this).siblings('.total').text()
      };

      var facetLabel = $('<a href="#" class="margin-right-small radius label facet"></a>');
      facetLabel.html('<span class="legend">' + facet.type + ': ' + facet.legend + ' ' + facet.count + '</span> &#215;');
      facetLabel.click(function (e) {
        e.preventDefault();
        $('input[type="checkbox"][data-agg-option="' + facet.key + '"]').attr('checked', false).trigger('change');
      });

      searchDescriptionContainer.append(facetLabel);

    });

    $('ul.details').on('click', 'a', function (e) {
      var pathName = window.location.pathname;
      if (!$(this).parent().closest('ul').is('.access') && pathName.indexOf(_searchUrl) >= 0) {
        localStorage.setItem('fromSearch', pathName + window.location.search);
      }
    });

    //find each agg
    $('ul[data-agg=true]').each(function () {
      //need this check because init is ajaxd
      if ($(this).hasClass('closed')) {
        //hide everything first... this is to allow the ajax facet updates to re-index positions etc
        $(this).find('li').hide();
        $(this).find('li:lt(4)').show();
      }
    });

    $('.show-all').each(function () {
      $(this).off('click').on('click', function (e) {
        e.preventDefault();

        var aggEl = $(this).parent().find('ul[data-agg=true]');

        if (aggEl.hasClass('closed')) {
          $(aggEl).find('li').show();
          $(aggEl).removeClass('closed');
        } else {
          $(aggEl).find('li:gt(3)').hide();
          $(aggEl).addClass('closed');
        }

        // Get current view status
        var dataShowStatus = $(this).attr('data-show-status');
        // Translate the current text into the selected language
        var currentText = dataShowStatus === 'more' ? AOP.translate('Show more') : AOP.translate('Show fewer');
        // Set the new text for the selected language
        var newText = dataShowStatus === 'more' ? AOP.translate('Show fewer') : AOP.translate('Show more');
        // Update aria label text, in the correct language.
        var currentAriaLabelText = $(this).attr('aria-label');
        $(this).attr('aria-label', currentAriaLabelText.replace(currentText, newText));
        AOP.accessibilitySearchAlert.handleMoreLessMessage(currentAriaLabelText.replace('Show', 'Showing'));
        // Update current view status
        $(this).attr('data-show-status', dataShowStatus === 'more' ? 'fewer' : 'more');

        // Replace visible link text
        $(this).text($(this).text() === AOP.translate('Show more') ? AOP.translate('Show fewer') : AOP.translate('Show more'));
      });
    });

    $('input[type="checkbox"][data-agg-option]').off('change').change(function () {
      $(this).attr('active', $(this).is(':checked'));
    });

    $('[data-agg-option]').change(function () {
      AOP.accessibilitySearchAlert.setFacetMessage(this);
      self.runSearch();
    });
    $('[data-agg-fire-click]').off('click').click(function (e) {
      AOP.accessibilitySearchAlert.setTextFilterMessage(this);
      self.runSearch();
      e.preventDefault();
    });

    $('[data-agg-fire-change]').off('change').change(function (e) {
      self.runSearch();
      e.preventDefault();
    });

    $('[data-agg-fire-confirm]').off('keypress').keypress(function (e) {
      if (e.which === 13) {
        e.preventDefault();
        AOP.accessibilitySearchAlert.setTextFilterMessage(this);
        self.runSearch();
      }
    });

    $('select.sort-by > option').each(function () {
      var optionLegend = $(this).is(':selected') ? AOP.translate('Sorted by') + ' ' + AOP.translate($(this).data('legend')) : AOP.translate($(this).data('legend'));
      $(this).text(optionLegend);
    });

    $('select.sort-by').off('change').on('change', function (e) {
      AOP.accessibilitySearchAlert.setSortOptionMessage($(this).find('option:selected').text());
      self.runSearch();
    });

    $(_conf.refineSearchForm).off('submit').on('submit', function (e) {
      _conf.query = $(this).find('input[name="q"]').val();
      self.runSearch();
      AOP.accessibilitySearchAlert.handleSingleFilterChange($(this).find('input[name="q"]'));
      e.preventDefault();
    });

    $('.pagination li:not(.disabled) a[data-page-number]').off('click').click(function () {
      var pageNumber = $(this).data('page-number');
      AOP.accessibilitySearchAlert.setPaginationOptionMessage(pageNumber);
      _self.runSearch({
        pageNum: pageNumber
      });
      return false;
    });

    _self.setAccessibilityOptions();

    if ($('#searchWithinIds').val()) {
      var searchWithinIds = $('#searchWithinIds').val().split(',');
      $.each(searchWithinIds, function (k, pId) {
        $('input[data-productid=' + pId + ']')
          .prop('disabled', true)
          .next('span').addClass('text-center text-primary').html('<span class="icon icon-tick"></span>');
      });
    }

  };

  this._init(opts);

  // Save the search
  $('.save-search').on('click', function (e) {
    e.preventDefault();
    _self.saveSearch();
  });

  //Workaround, this will detect a back button after a push state has been used, and force a refresh to restore state.
  //The alternative would be to deconstruct the url params and fire the ajax query again, a possible future improvement.
  $(window).on('popstate', function (e) {
    // Check for existence of state object data "productSearch: true", this allows us check for this variable
    // when the "popstate" event is fired, and then only reload the page, if the user has click back to
    // the search results page. This is to get around issues with Safari version <=8 and earlier versions of Chrome
    // where the pop state will fire on initial page load and get itself into the reload loop.
    // @TODO - "popstate" only ever seems to fire for Safari - is this event required? Hitting the back button and
    // getting the previous search results seems to work fine with this code disabled.
    if (e.originalEvent.state && e.originalEvent.state.productSearch) {
      location.reload();
    }
  });

  // Bind any click within the the other formats tooltip to open the current product page
  $('body').on('click', '.other-formats-tooltip', function (e) {
    // If user has clicked on icon, treat it as normal click, so they they ctrl-click, etc.
    if ($(e.target).is('a')) {
      return;
    }
    // Otherwise detect any click within the qtip and send them to the product page.
    var productId = $(this).attr('data-prod-id');
    if (productId) {
      window.location = '/product/' + productId;
    }
  });

};

$(document).ready(function () {

  $('[data-search-init]').each(function () {
    var opts = {};
    opts.actionsContainer = $(this);

    if ($(this).attr('data-search-result-container')) {
      opts.resultsContainer = $(this).data('searchResultContainer');
    }

    if ($('#q').size()) {
      opts.query = $('#q').val();
    }

    AOP.search(opts);
  });

  //init pub year tracking
  if (AOP.gaEvents && AOP.gaEvents.search) {
    AOP.gaEvents.search.initPubDates();
  }

});
