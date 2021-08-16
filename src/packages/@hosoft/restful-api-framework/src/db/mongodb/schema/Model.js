/**
 * HoServer API Server Ver 2.0
 * create: 2018/11/2
 **/
const autoIncrement = require('../plugins/mongoose-auto-increment')
const mongoose = require('mongoose')
const mongoosePaginate = require('../plugins/mongoose-paginate')
const timestamps = require('../plugins/mongoose-timestamp')

/**
 * Model definition
 */
const ModelSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: true
    },
    name: {
        type: String,
        required: true,
        searchable: true,
        index: true
    },
    dis_name: {
        type: String,
        required: true,
        searchable: true
    },
    // correspond service
    // service: {
    //     type: String
    // },
    type: {
        type: Number
    },
    category_name: {
        type: String
    },
    timestamp: {
        type: Boolean,
        default: true
    },
    db_table: {
        type: String,
        required: true
    },
    route_name: {
        type: String
    },
    properties: [
        mongoose.Schema({
            name: String,
            dis_name: String,
            prop_type: String,
            width: Number,
            auto_increment: {
                type: Boolean,
                default: false
            },
            unique: {
                type: Boolean,
                default: false
            },
            index: {
                type: mongoose.Schema.Types.Mixed,
                default: false
            },
            // input flag (0: Not allow input，1: Optional input，2: Must input，3: Force use default value)
            input_flag: {
                type: Number,
                default: false
            },
            // search flag（0: Not allow search, 1: exact match, 2: Fuzzy matching, 3: Force use default value）
            search_flag: {
                type: Number,
                default: 1
            },
            // output flag，
            //  0: Not allow to output (include detail),
            //  1: Output by default，
            //  2：Not output by default (still output when query detail),
            //  3: Auto output according sub property output settings
            output_flag: {
                type: Number,
                default: 1
            },
            // default value
            default_val: mongoose.Schema.Types.Mixed,
            description: {
                type: String
            },
            // display order (used in admin site)
            order: Number,
            // nest sub properties
            properties: [mongoose.Schema.Types.Mixed],
            // relation field
            relations: {
                // 1: model，2: enum, 3: system dict
                rel_type: String,
                // when rel_type=1, name is model name
                // when rel_type=2, name is enum string
                // when rel_type=3, name is dict name
                name: String,
                // when rel_type=1, field is the relation model field
                field: String
            }
        })
    ],
    description: {
        type: String
    }
})

autoIncrement.initialize(mongoose.connection)
ModelSchema.plugin(mongoosePaginate)
ModelSchema.plugin(timestamps)

module.exports = mongoose.model('Model', ModelSchema, 'api_models')
