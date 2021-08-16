const path = require('path')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

module.exports = {
    mode: 'production',
    output: {
        libraryTarget: "commonjs"
    },
    entry: path.resolve(__dirname) + '/index.js',
    externals: {
        "@ant-design/compatible": "@ant-design/compatible",
        "@ant-design/icons": "@ant-design/icons",
        "@ant-design/pro-layout": "@ant-design/pro-layout",
        "@ant-design/pro-table": "@ant-design/pro-table",
        "antd": "antd",
        "lodash": "lodash",
        "moment": "moment",
        "qs": "qs",
        "querystring": "querystring",
        "prop-types": "prop-types",
        "react": "react",
        "react-dom": "react-dom",
        "react-json-view": "react-json-view",
        "path-to-regexp": "path-to-regexp",
        "pluralize": "pluralize",
        "umi": "umi",
        "umi-request": "umi-request"
    },
    optimization: {
        minimize: true
    },
    devtool: "source-map",
    resolve: {
        extensions: ['.js', '.jsx']
    },
    plugins: [new MiniCssExtractPlugin()],
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
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: "less-loader"
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
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: 'css-loader'
                    }
                ]
            }
        ]
    }
};
