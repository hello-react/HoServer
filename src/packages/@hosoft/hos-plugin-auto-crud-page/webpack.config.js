const path = require('path')

module.exports = {
    mode: 'production',
    output: {
        libraryTarget: "commonjs"
    },
    entry: path.resolve(__dirname) + '/admin/plugin-index.js',
    externals: {
        "@ant-design/compatible": "@ant-design/compatible",
        "@ant-design/icons": "@ant-design/icons",
        "@ant-design/pro-layout": "@ant-design/pro-layout",
        "@ant-design/pro-table": "@ant-design/pro-table",
        "@hosoft/hos-admin-common": "@hosoft/hos-admin-common",
        "react-beautiful-dnd": "react-beautiful-dnd",
        "antd": "antd",
        "dva": "dva",
        "moment": "moment",
        "lodash": "lodash",
        "react": "react",
        "react-dom": "react-dom"
    },
    optimization: {
        minimize: true
    },
    devtool: "source-map",
    resolve: {
        extensions: ['.js', '.jsx']
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
            {
                test: /\.less$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: "less-loader",
                        options: {
                            javascriptEnabled: true
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader'
                    }
                ]
            }
        ]
    }
};
