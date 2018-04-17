/* global Drop */
var filterDimensionPanelName = 'Filter Dimension';

prism.registerWidget('wiserFilterWidget', {
  name: 'wiserFilterWidget',
  family: 'wiser',
  title: 'Filter',
  priority: 0,

  iconSmall: '/plugins/wiserFilterWidget/images/wiser-widget-24.png',

  styleEditorTemplate: null,
  style: {
    isDependantFilter: true, // ?
    ignoreDashboardFilter: true // ?
  },
  data: {
    selection: [filterDimensionPanelName], // ?

    defaultQueryResult: {},

    panels: [
      {
        name: filterDimensionPanelName,
        type: 'visible',
        allowedDataTypes: ['text'], // ?
        metadata: {
          types: ['dimensions'],
          maxitems: 1
        }
      },
      {
        name: 'filters',
        type: 'filters',
        metadata: {
          types: ['dimensions'],
          maxitems: -1
        }
      }
    ],

    buildQuery: function(widget) {
      var query = {
        datasource: widget.datasource,
        metadata: []
      };

      var dimensionPanel = widget.metadata.panel(filterDimensionPanelName);
      query.metadata.push(dimensionPanel.items[0]);

      widget.metadata.panel('filters').items.forEach(function(item) {
        var queryItem = $$.object.clone(item, true);
        queryItem.panel = 'scope';

        query.metadata.push(queryItem);
      });

      return query;
    },

    processResult: function(widget, queryResult) {
      return queryResult.rows();
    }
  },

  // Hook to manipulate the final query prior to being sent
  beforequery: function(widget, event) {
    if (event.query.metadata.length === 0) {
      return;
    }

    // If we're not ignoring the dashboard filter, don't do anything
    if (!widget.style.ignoreDashboardFilter) {
      return;
    }

    // We don't want to filter on our selected dimension. Otherwise,
    // filtering on any values would result in only those values showing
    // up in the dropdown.
    var dimensionPanel = widget.metadata.panel(filterDimensionPanelName);
    var widgetFilterDimension = dimensionPanel.items[0].jaql.dim;

    var dashboardFilterDimensions = widget.metadata.panel('filters').items.map(function(item) {
      return item.jaql.dim;
    });

    // Check which filters are being applied to the outgoing query and take
    // out the one that would affect the dimension we are filtering on
    // ourselves
    event.query.metadata = _.reject(event.query.metadata, function(metadatum) {
      // Check if it is a filter and if it is a dashboard filter
      var isFilter = metadatum.panel === 'scope';
      var isDashboardFilter = dashboardFilterDimensions.indexOf(metadatum.jaql.dim) === -1;
      var matchesDimension = metadatum.jaql.dim === widgetFilterDimension;

      return isFilter && isDashboardFilter && matchesDimension;
    });
  },

  render: function(widget, event) {
    if (!widget.queryResult.length) {
      return;
    }

    var element = event.element;
    var $element = $(element);

    var drop = $element.data('_drop');

    var dimensionPanel = widget.metadata.panel(filterDimensionPanelName);
    var dimensionFilter = dimensionPanel.items[0];

    var $trigger; // FIXME
    var $triggerTitle;
    if (!drop) {
      $element.addClass('wiser-filter-widget');

      $trigger = $('<div class="wiser-filter-widget__trigger"></div>');
      $trigger.appendTo($element);

      $triggerTitle = $('<div class="wiser-filter-widget__trigger-title"></div>');
      $triggerTitle.appendTo($trigger);

      drop = new Drop({
        target:  $trigger[0],
        position: 'bottom center',
        classes: 'wiser-filter-widget__content',

        // We use a function to build the content so it can represent
        // the latest state of the dashboard filters every time you open
        // the dropdown
        content: function() {
          var filterItems = widgetFilterItems(widget);

          var currentFilters = prism.activeDashboard.filters.$$items;
          // FIXME: Can there be multiple filters on the same dim?
          var relevantFilter = currentFilters.filter(function(filter) {
            return filter.jaql.dim === dimensionFilter.jaql.dim;
          })[0];

          var filterMembers = (relevantFilter && relevantFilter.jaql.filter.members) || [];

          var content = '';

          content += '<ul class="wiser-filter-widget__options">';

          var allChecked = _.difference(filterItems, filterMembers).length === 0;

          // FIXME: The below is mostly duplicated between the select
          // all and the other filter options

          content +=
              '<li class="wiser-filter-widget__option wiser-filter-widget__select-all">' +
                  '<label>' +
                          '<input type="checkbox"' +
                              ' class="wiser-filter-widget__option-checkbox"' +
                              (allChecked ? ' checked="checked"' : '') +
                              '>' +
                      'Select All' +
                  '</label>' +
              '</li>';

          filterItems.forEach(function(item) {
            var checked = filterMembers && filterMembers.indexOf(item) > -1;
            content +=
                '<li class="wiser-filter-widget__option">' +
                    '<label>' +
                        '<input type="checkbox"' +
                            ' class="wiser-filter-widget__option-checkbox"' +
                            (checked ? ' checked="checked"' : '') +
                            '>' +
                        item +
                    '</label>' +
                '</li>';
          });
          content += '</ul>';

          return content;
        },
        beforeClose: function() {
          var lastFilter = widget._lastFilterOptions;

          var $options = $('.drop.drop-open .wiser-filter-widget__option:not(.wiser-filter-widget__select-all)').toArray();

          var $selectedOptions = $options.filter(function(element) {
            return !!$(element).find('input[type="checkbox"]:checked').length;
          });

          var selectedData = $selectedOptions.map(function(element) {
            return $(element).text().trim();
          });

          if (_.isEqual(_.sortBy(lastFilter), _.sortBy(selectedData))) {
            return;
          }

          var anySelected = !!selectedData.length;

          if (anySelected) {
            $trigger.addClass('wiser-filter-widget__trigger--selected');
          } else {
            $trigger.removeClass('wiser-filter-widget__trigger--selected');
          }

          var filter = {
            jaql: {
              column:   dimensionFilter.jaql.column,
              table:    dimensionFilter.jaql.table,
              dim:      dimensionFilter.jaql.dim,
              datatype: dimensionFilter.jaql.datatype,
              level:    dimensionFilter.jaql.level,
              title:    dimensionFilter.jaql.title
            }
          };

          if (anySelected) {
            filter.jaql.filter = {
              members: selectedData,
              all: false
            };
          } else {
            filter.jaql.filter = {
              all: true,
              explicit: false, // ?
              multiSelection: true // ?
            };
          }

          prism.activeDashboard.filters.update(filter, {
            save: true,
            refresh: true,
            unionIfSameDimensionAndSameType: false // ?
          });
        }
      });

      drop.on('open', function() {
        $trigger.addClass('wiser-filter-widget__trigger--open');

        // FIXME: Getting selected options is duplicated
        var $options = $('.drop.drop-open .wiser-filter-widget__option:not(.wiser-filter-widget__select-all)').toArray();

        var $selectedOptions = $options.filter(function(element) {
          return !!$(element).find('input[type="checkbox"]:checked').length;
        });

        var selectedData = $selectedOptions.map(function(element) {
          return $(element).text().trim();
        });
        widget._lastFilterOptions = selectedData;

        // Since we cannot set the indeterminate state from HTML (which
        // is how the drop content is passed), we have to manually
        // update the state when the drop opens
        updateSelectAllCheckbox();
      });

      drop.on('close', function() {
        $trigger.removeClass('wiser-filter-widget__trigger--open');
      });

      // Handle a filter checkbox being checked
      // We need to listen on body since the dropdown content is
      // dynamically appended to it, outside of the widget
      $('body').on('change', '.wiser-filter-widget__option input[type="checkbox"]', function(event) {
        var isSelectAll = !!$(event.target).parents('.wiser-filter-widget__select-all').length;

        if (isSelectAll) {
          $('.drop.drop-open .wiser-filter-widget__option-checkbox').each(function(index, element) {
            element.checked = event.target.checked;
          });
        } else {
          // It was another checkbox checked
          updateSelectAllCheckbox();
        }
      });

      $element.data('_drop', drop);
    }

    // FIXME: This is mostly duplicated code
    $trigger = $('.wiser-filter-widget__trigger', element);
    $triggerTitle = $('.wiser-filter-widget__trigger-title', element);

    var currentFilters = prism.activeDashboard.filters.$$items;

    var relevantFilters = _.flatten(currentFilters.filter(function(filter) {
      return filter.jaql.dim === dimensionFilter.jaql.dim &&
             !filter.jaql.filter.all;
    }).map(function (filter) {
      return filter.jaql.filter.members;
    }));

    if (relevantFilters.length) {
      $trigger.addClass('wiser-filter-widget__trigger--selected');
    } else {
      $trigger.removeClass('wiser-filter-widget__trigger--selected');
    }

    var filterItems = widgetFilterItems(widget);

    var numSelected = relevantFilters.length;
    var anySelected = numSelected > 0;
    var oneSelected = numSelected == 1;
    var allSelected = numSelected == filterItems.length;

    var firstFilter = relevantFilters[0];

    if (allSelected) {
      $triggerTitle.text(dimensionFilter.jaql.title + ' - All selected');
    } else if (oneSelected) {
      $triggerTitle.text(firstFilter);
    } else if (anySelected) {
      $triggerTitle.text(firstFilter + ' (+' + (numSelected - 1) + ')');
    } else { // none selected
      $triggerTitle.text(dimensionFilter.jaql.title);
    }
  },

  destroy: function (widget, event) {
    var element = event.element;
    var $element = $(element);

    // Clean up the Drop instance
    var drop = $element.data('_drop');
    if (drop) {
      drop.destroy();
    }

    delete widget._lastFilterOptions;

    // Clear out any existing DOM
    $element.empty();
    $element.removeData();
  },

  sizing: {
    minHeight: 73,
    height: 76
  }
});

function widgetFilterItems(widget) {
  return _.chain(widget.queryResult)
    .map(function(item) { return item[0].text; })
    .compact()
    .unique()
    .value();
}

function isChecked(checkbox) {
  return checkbox.checked;
}

function updateSelectAllCheckbox() {
  var selectAllCheckbox = document.querySelector('.drop.drop-open .wiser-filter-widget__select-all input[type="checkbox"]');

  // If at least one is selected, show the select all in an
  // indeterminate state. Note that document.querySelectorAll
  // returns a NodeList which is Array-like but does not have
  // Array methods.
  var optionCheckboxes = Array.prototype.slice.call(
    document.querySelectorAll('.drop.drop-open .wiser-filter-widget__option:not(.wiser-filter-widget__select-all) input[type="checkbox"]')
  );
  var allSelected = optionCheckboxes.every(isChecked);
  var anySelected = optionCheckboxes.some(isChecked);

  if (anySelected && !allSelected) {
    selectAllCheckbox.indeterminate = true;
  } else {
    selectAllCheckbox.indeterminate = false;
    selectAllCheckbox.checked = allSelected;
  }
}
