window.JSFile = window.JSFile || {};

(function(module) {
    'use strict';

    /**
     * Workbook Model
     *
     * @param data
     * @constructor
     */
    module.Workbook = function(data) {

        var MESSAGE_DATA_IS_REQUIRED = "data param is required for Workbook model";

        if (_.isUndefined(data) || _.isNull(data)) {
            throw new Error(MESSAGE_DATA_IS_REQUIRED);
        }

        var self = this;

        this.SheetNames = [];
        this.Sheets = {};

        // transform data
        data = module.FileUtil.transformData(data);

        // sheets
        _.forEach(data, function(sheet) {

            self.SheetNames.push(sheet.name);
            self.Sheets[sheet.name] = new module.Worksheet(sheet);
        });
    };

})(window.JSFile);
