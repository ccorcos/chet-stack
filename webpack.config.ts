import HtmlWebpackPlugin from "html-webpack-plugin"
import MiniCssExtractPlugin from "mini-css-extract-plugin"
import * as path from "path"
import { Configuration } from "webpack"

const config: Configuration = {
	mode: process.env.NODE_ENV === "production" ? "production" : "development",
	entry: "./src/index.tsx",
	resolve: {
		extensions: [".js", ".ts", ".tsx"],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: [{ loader: "ts-loader" }],
			},
			{
				test: /\.css$/i,
				use: [MiniCssExtractPlugin.loader, "css-loader"],
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
		new MiniCssExtractPlugin(),
		new HtmlWebpackPlugin({
			template: path.join(__dirname, "src/index.html"),
		}),
	],
}

// Dev server configs aren't typed properly.
Object.assign(config, {
	devServer: {
		historyApiFallback: true,
		static: {
			publicPath: "/",
			directory: path.join(__dirname, "dist"),
		},
	},
})

export default config
