const PANEL_FILTER_DIMENSION = 'Filter Dimension';

prism.registerWidget('wiserFilterWidget', {
  name: 'wiserFilterWidget',
  family: 'wiser',
  title: 'Filter',
  priority: 0,

  iconSmall: '/plugins/wiserFilterWidget/images/wiser-widget-24.png',

  style: {
    ignoreDashboardFilter: true,
    multipleSelect: true
  },
  styleEditorTemplate: '/plugins/WiserFilterWidget/style-editor/template.html',
  hideNoResults: true,

  directive: 'wiser-filter-widget',

  data: {
    panels: [
      {
        name: PANEL_FILTER_DIMENSION,
        type: 'visible',
        allowedDataTypes: 'text',
        metadata: { types: ['dimensions'], maxitems: 1 }
      },

      {
        name: 'filters',
        type: 'filters',
        metadata: { types: ['dimensions'], maxitems: -1 }
      }
    ],

    // allocatePanel ??
    // isSupported ??
    // rankMetadata ??
    // populateMetdata ??

    buildQuery(widget) {
      let query = {
        datasource: widget.datasource,
        metadata: []
      };

      let dimensionPanel = widget.metadata.panel(PANEL_FILTER_DIMENSION);
      query.metadata.push(dimensionPanel.items[0]);

      widget.metadata.panel('filters').items.forEach(function (item) {
        let queryItem = $$.object.clone(item, true);
        queryItem.panel = 'scope';

        query.metadata.push(queryItem);
      });

      return query;
    },

    processResult(widget, queryResult) {
      return _.map(queryResult.rows(), (row) => row[0]);
    }
  },

  // Before the final query gets sent, omit any filter which filters on our
  // current dimension to avoid self-filtering
  beforequery(widget, event) {
    if (!event.query.metadata.length) { return; }
    if (!widget.style.ignoreDashboardFilter) { return; }

    let dimensionPanel = widget.metadata.panel(PANEL_FILTER_DIMENSION);
    let widgetFilterDimension = dimensionPanel.items[0].jaql.dim;

    let filterPanel = widget.metadata.panel('filters');
    let filterDimensions = filterPanel.items.map((item) => item.jaql.dim);

    event.query.metadata = _.reject(event.query.metadata, function(metadatum) {
      let isFilter = metadatum.panel === 'scope';
      let isWidgetFilter = filterDimensions.indexOf(metadatum.jaql.dim) === -1;
      let matchesDimension = metadatum.jaql.dim === widgetFilterDimension;

      return isFilter && isWidgetFilter && matchesDimension;
    });
  },

  // ready ??
  // mask ??
  // options?

  sizing: {
    minHeight: 73,
    height: 76
  }
});
