import * as path from "path"
import * as HtmlWebpackPlugin from "html-webpack-plugin"
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
						loader: "babel-loader",
					},
					{
						loader: "ts-loader",
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
	devServer: {
		publicPath: "/",
		historyApiFallback: true,
	},
}

export default config
