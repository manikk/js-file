"use strict";

window.JSFile = window.JSFile || {};

(function(module) {

    /**
     * FileUtil Class
     *
     * @constructor
     */
    var FileUtil = function() {

        var self = this;

        // data alternatives (these will be used as replacements for missing data)

        var data_alternatives = {
            sheet: {
                columns:    [],
                data:       [],
                headers:    [],
                name:       []
            },
            headers: {
                colspan:    ['cols'],
                rowspan:    ['rows'],
                value:      ['display_name', 'name', 'label']
            },
            columns: {
                type:       []
            }
        };


        ///////////////////////////////////////////////////////////
        //
        // public methods
        //
        ///////////////////////////////////////////////////////////

        /**
         * transformData
         *
         * @param data
         */
        this.transformData = function(data) {

            // convert root to indexed array
            if (!_.isArray(data)) {
                data = [data];
            }

            // loop sheets
            _.forEach(data, function (item, index, obj) {

                // transform sheet
                data[index] = transformSheet(item, index);

                // headers should contain array of rows
                if (!_.isArray(item.headers[0])) {
                    data[index].headers = [item.headers];
                }

                // headers
                _.forEach(data[index].headers, function (item_header_rows, header_row_index) {

                    // columns
                    _.forEach(item_header_rows, function(item_header_column, header_column_index) {

                        // transform
                        data[index].headers[header_row_index][header_column_index] = transformHeader(item_header_column);

                    });
                });
            });

            return data;
        };

        /**
         * nextLetter
         *
         * @param letter
         * @param increment
         * @returns {*}
         */
        this.nextLetter = function(letter, increment) {

            if (_.isUndefined(increment)) {
                increment = 1;
            }

            return letter.replace(/([a-zA-Z])[^a-zA-Z]*$/, function(arr) {
                var char = arr.charCodeAt(0);
                switch(char){
                    case 90: return 'A';
                    case 122: return 'a';
                    default: return String.fromCharCode((char + increment));
                }
            });
        };

        /**
         * letterToNumber
         *
         * @param letter
         * @returns {number}
         */
        this.letterToNumber = function(letter) {
            if (letter === letter.toLowerCase()) {
                return letter.charCodeAt(0) - 96;
            }
            return letter.charCodeAt(0) - 64;
        };

        /**
         * numberToLetter
         *
         * @param number
         * @param uppercase
         * @returns {letter}
         */
        this.numberToLetter = function(number, uppercase) {
            if (uppercase) {
                return String.fromCharCode(number + 64);
            }
            return String.fromCharCode(number + 96);
        };

        /**
         * transformWorksheetHeadersArray
         * inserts blank items based on rowspans & colspans
         *
         * @param headers
         * @returns {Array}
         */
        this.transformWorksheetHeadersArray = function(headers) {

            _.forEach(headers, function (row, row_index) {
                _.forEach(row, function (column, column_index) {

                    // add rows
                    if (column.rowspan > 1) {

                        for (var row_count = 1; row_count < column.rowspan; row_count++) {

                            var next_row = row_index + row_count;

                            // create next row if does not exist
                            if (!_.has(headers, next_row)) {
                                headers[next_row] = [];

                                // create next row columns
                                for (var i=0; i<column_index; i++) {
                                    headers[next_row].push({});
                                }
                            }

                            // splice into next row
                            headers[next_row].splice(column_index, 0, {});
                        }
                    }

                    // add columns
                    if (column.colspan > 1) {

                        for (var column_count = 1; column_count < column.colspan; column_count++) {

                            var next_column = column_index + column_count;

                            // splice into next column
                            headers[row_index].splice(next_column, 0, {});
                        }
                    }
                });
            });

            return headers;
        };

        /**
         * convertWorksheetHeadersArrayToObject
         *
         * @param headers
         * @returns {{}}
         */
        this.convertWorksheetHeadersArrayToObject = function(headers) {

            var result = {};

            _.forEach(headers, function (row, row_index) {

                var letter = "A";

                _.forEach(row, function(column, column_index) {

                    // add value (if exists)
                    if (_.has(column, 'value')) {
                        result[letter + (row_index + 1)] = column.value;
                    }

                    // increment letter
                    letter = self.nextLetter(letter);
                });

            });

            return result;
        };

        /**
         * calculateWorksheetHeadersMerges
         *
         * @param headers
         * @returns {Array}
         */
        this.calculateWorksheetHeadersMerges = function(headers) {

            var result = [];

            _.forEach(headers, function (row, row_index) {
                _.forEach(row, function (column, column_index) {

                    // if has rowspan or colspan greater than 1
                    if ((_.has(column, 'rowspan') && column.rowspan > 1) || (_.has(column, 'colspan') && column.colspan > 1)) {

                        result.push({
                            s: {c: column_index, r: row_index}, // start
                            e: {c: column_index + (column.colspan - 1), r: row_index + (column.rowspan - 1)}  // end
                        });
                    }
                });
            });

            return result;
        };

        /**
         * transformSheet
         *
         * @param data
         * @param index
         */
        var transformSheet = function(data, index) {

            // get keys
            var keys = _.keys(data);

            // name
            if (!_.has(data, 'columns')) {
                data.columns = findAlternativeData(data, keys, data_alternatives.sheet.columns, []);
            }
            // data
            if (!_.has(data, 'data')) {
                data.data = findAlternativeData(data, keys, data_alternatives.sheet.data, []);
            }
            // headers
            if (!_.has(data, 'headers')) {
                data.headers = findAlternativeData(data, keys, data_alternatives.sheet.headers, []);
            }
            // name
            if (!_.has(data, 'name')) {
                data.name = findAlternativeData(data, keys, data_alternatives.sheet.name, "sheet" + (index+1));
            }

            return {
                columns:    data.columns,
                data:       data.data,
                headers:    data.headers,
                name:       data.name
            };
        };

        /**
         * transformColumn
         *
         * @param column
         * @param header
         * @returns {{type: *}}
         */
        var transformColumn = function(column, header) {

            return {
                type: _.has(column, 'type') ? column.type : (_.has(header, 'type') ? header.type : 'string')
            }
        };

        /**
         * transformHeader
         *
         * @param data
         */
        var transformHeader = function(data) {

            var _data = {};
            var keys= [];

            // loop fields

            _.forEach(data, function (item, key, obj) {

                // convert item keys & values to snake case
                if (!_.isObject(item)) {
                    var key     = _.snakeCase(key);
                    _data[key]  = item;
                    keys.push(key);
                }
            });

            // value
            if (!_.has(_data, 'value')) {
                _data.value = findAlternativeData(_data, keys, data_alternatives.headers.value);
            }
            // rowspan
            if (!_.has(_data, 'rowspan')) {
                _data.rowspan = parseInt(findAlternativeData(_data, keys, data_alternatives.headers.rowspan, 1));
            }
            // colspan
            if (!_.has(_data, 'colspan')) {
                _data.colspan = parseInt(findAlternativeData(_data, keys, data_alternatives.headers.colspan, 1));
            }

            return {
                value:      _data.value,
                rowspan:    _data.rowspan,
                colspan:    _data.colspan
            };
        };

        /**
         * findAlternativeData
         *
         * @param data
         * @param keys
         * @param alternatives
         * @param default_value
         * @returns {*}
         */
        var findAlternativeData = function(data, keys, alternatives, default_value) {

            var result = !_.isUndefined(default_value) ? default_value : "";

            _.forEach(alternatives, function (alternative) {

                if (_.includes(keys, alternative)) {
                    result = data[alternative];
                    return false; // break
                }
            });

            return result;
        }
    };

    // create singleton
    module.FileUtil = new FileUtil();

})(window.JSFile);
"use strict";

window.JSFile = window.JSFile || {};

(function(module) {

    /**
     * Workbook Model
     *
     * @param data
     * @constructor
     */
    module.Workbook = function(data) {

        if (_.isUndefined(data) || _.isNull(data)) {
            throw new Error()
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

"use strict";

window.JSFile = window.JSFile || {};

(function(module) {

    /**
     * Worksheet Model
     *
     * @param data
     * @constructor
     */
    module.Worksheet = function(data) {

        var self = this;

        this['!merges'] = [];
        this['!ref'] = [];

        // transform headers array
        var headers = module.FileUtil.transformWorksheetHeadersArray(data.headers);

        // count letters
        var letter_count = [];
        _.forEach(headers, function (item, key, obj) {
            letter_count.push(item.length);
        });

        // calculate worksheet merges
        this['!merges'] = module.FileUtil.calculateWorksheetHeadersMerges(headers);

        // set body row starting point
        var cell_number = headers.length + 1;

        // convert header array to object
        headers = module.FileUtil.convertWorksheetHeadersArrayToObject(headers);

        // set worksheet header data
        _.forEach(headers, function (value, key, obj) {

            // TODO: add column type support
            self[key] = {t: 's', v: value};
        });

        // set worksheet body data

        _.forEach(data.data, function(row) {

            var cell_letter = 'A';
            var _letter_count = 0;

            _.forEach(row, function(item) {

                // add data
                self[cell_letter + cell_number] = {v: item.value, t: 's'};

                // increment letter
                cell_letter = module.FileUtil.nextLetter(cell_letter);

                // count letters
                _letter_count++;
            });

            letter_count.push(_letter_count);

            // increment cell number
            cell_number++;
        });

        // get highest letter
        var highest_letter = _.max(letter_count);

        // set worksheet range
        this['!ref'] = XLSX.utils.encode_range({
            s: {c: 0, r: 0}, // start
            e: {c: (highest_letter - 1), r: (cell_number - 2)} // end
        });
        
    };

})(window.JSFile);

"use strict";

window.JSFile = window.JSFile || {};

(function(module) {

    /**
     * FileDownloader Class
     *
     * @constructor
     */
    var FileDownloader = function() {

        var self = this;

        /**
         * downloadWorkbook
         *
         * @param workbook
         * @param file_name
         */
        this.downloadWorkbook = function(workbook, file_name) {

            if (!file_name) {
                file_name = 'download.xlsx';
            }

            if (!_.endsWith(file_name, '.xlsx')) {
                file_name += '.xlsx';
            }

            // TODO: add config to specify output format
            var workbook_output = XLSX.write(workbook, {bookType:'xlsx', bookSST:false, type: 'binary'});
            var array_buffer = convertStringToArrayBuffer(workbook_output);

            downloadFile(file_name, array_buffer);
        };


        ///////////////////////////////////////////////////////////
        //
        // helper methods
        //
        ///////////////////////////////////////////////////////////

        /**
         * convertStringToArrayBuffer
         *
         * @param str
         * @returns {ArrayBuffer}
         */
        function convertStringToArrayBuffer(str) {
            var array_buffer = new ArrayBuffer(str.length);
            var view = new Uint8Array(array_buffer);
            for (var i = 0; i != str.length; ++i) {
                view[i] = str.charCodeAt(i) & 0xFF;
            }
            return array_buffer;
        }

        /**
         * downloadFile (from Angular UI Data Grid)
         * TODO: research this and clean up
         *
         * @param file_name
         * @param array_buffer
         * @returns {*}
         */
        var downloadFile = function (file_name, array_buffer) {

            var D = document;
            var a = D.createElement('a');
            var strMimeType = 'application/octet-stream;charset=utf-8';
            var rawFile;

            // IE10+
            if (navigator.msSaveBlob) {
                return navigator.msSaveBlob(new Blob(["\ufeff", array_buffer], {
                    type: strMimeType
                }), file_name);
            }

            //html5 A[download]
            if ('download' in a) {

                var blob = new Blob([array_buffer], {
                    type: strMimeType
                });
                rawFile = URL.createObjectURL(blob);
                a.setAttribute('download', file_name);
            } else {
                rawFile = 'data:' + strMimeType + ',' + encodeURIComponent(array_buffer);
                a.setAttribute('target', '_blank');
            }

            a.href = rawFile;
            a.setAttribute('style', 'display:none;');
            D.body.appendChild(a);
            setTimeout(function() {
                if (a.click) {
                    a.click();
                    // Workaround for Safari 5
                } else if (document.createEvent) {
                    var eventObj = document.createEvent('MouseEvents');
                    eventObj.initEvent('click', true, true);
                    a.dispatchEvent(eventObj);
                }
                D.body.removeChild(a);

            }, 100);
        };
    };

    module.FileDownloader = new FileDownloader();

})(window.JSFile);