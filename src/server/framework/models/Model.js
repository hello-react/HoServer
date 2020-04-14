/**
 * SWOOP Model Server Ver 1.0
 * create: 2018/11/2
 * author: Jack Zhang
 **/
const autoIncrement = require('../db/mongoose-auto-increment')
const mongoose = require('mongoose')
const mongoosePaginate = require('../db/mongoose-paginate')
const timestamps = require('../db/mongoose-timestamp')

/**
 * 对象定义
 */
const ModelSchema = new mongoose.Schema({
    // 对象名称
    name: {
        type: String,
        required: true,
        searchable: true,
        index: true
    },
    // 显示名称
    dis_name: {
        type: String,
        required: true,
        searchable: true
    },
    // 对应的服务
    // service: {
    //     type: String
    // },
    // 分类名称
    category_name: {
        type: String
    },
    // 启用时间戳字段
    timestamp: {
        type: Boolean,
        default: true
    },
    // 数据库表名称
    db_table: {
        type: String,
        required: true
    },
    // 路由名称，指定路由名称后将优先使用此名称生成 API 路由URL
    route_name: {
        type: String
    },
    // 属性列表
    properties: [
        mongoose.Schema({
            // 属性名称
            name: String,
            // 显示名称
            dis_name: String,
            // 数据类型
            prop_type: String,
            // 宽度
            width: Number,
            // 是否自增长字段
            auto_increment: {
                type: Boolean,
                default: false
            },
            // 是否唯一
            unique: {
                type: Boolean,
                default: false
            },
            // 是否索引
            index: {
                type: mongoose.Schema.Types.Mixed,
                default: false
            },
            // 输入选项 (0: 禁止输入，1: 可选输入，2: 必须输入，3: 强制使用默认值)
            input_flag: {
                type: Number,
                default: false
            },
            // 查询标识（0: 无搜索, 1: 精确匹配, 2: 模糊匹配, 3: 强制使用默认值）
            search_flag: {
                type: Number,
                default: 1
            },
            // 输出选项，0: 禁止输出 (禁止输出后查询详情也不会输出), 1: 默认输出，2：默认不输出, 3: 根据子属性输出选项自动设置
            output_flag: {
                type: Number,
                default: 1
            },
            // 默认值
            default_val: mongoose.Schema.Types.Mixed,
            // 属性描述
            description: {
                type: String
            },
            // 显示顺序
            order: Number,
            // 嵌套属性
            properties: [mongoose.Schema.Types.Mixed],
            // 关联字段
            relations: {
                // 1: 表，2：枚举, 3: 系统字典, 4: 区域地址
                rel_type: String,
                // 关联类型为1时，name 为表名，为2时，name 为枚举名称, 为3时，name 为字典名称
                name: String,
                // 关联类型为1时对应的字关联段名称
                field: String
            }
        })
    ],
    // Model 描述
    description: {
        type: String
    }
})

autoIncrement.initialize(mongoose.connection)
ModelSchema.plugin(mongoosePaginate)
ModelSchema.plugin(timestamps)

module.exports = mongoose.model('Model', ModelSchema, 'api_models')
