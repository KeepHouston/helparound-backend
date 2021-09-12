const path = require('path')

module.exports = {
    externals: [
        nodeExternals(),
        nodeExternals({
            modulesDir: path.resolve(__dirname, '../../../node_modules'),
        }),
    ],
    resolve: {
        alias: {
            graphql$: path.resolve(
                __dirname,
                './node_modules/graphql/index.js'
            ),
        },
    },
}
