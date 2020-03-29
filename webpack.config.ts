import * as path from "path"
import HtmlWebpackPlugin from "html-webpack-plugin"
import { Configuration } from "webpack"

const config: Configuration = {
	entry: "./src/index.tsx",
	resolve: {
		extensions: [".js", ".ts", ".tsx"],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "awesome-typescript-loader",
					},
				],
			},
		],
	},
	cache: true,
	devtool: "source-map",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name]-[chunkhash].js",
		chunkFilename: "[name]-[chunkhash].js",
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.join(__dirname, "src/index.html"),
		}),
	],
}

// Dev server configs aren't typed properly.
Object.assign(config, {
	devServer: {
		publicPath: "/",
		historyApiFallback: true,
	},
})

export default config
