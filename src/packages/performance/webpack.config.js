const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "../../../public/tracker/"),
    filename: "tracker.min.js",
    iife: true,
    library: undefined,
  },
  mode: "production",
  // 禁用 sourcemap
  devtool: false,

  resolve: {
    extensions: [".ts", ".js"],
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            compilerOptions: {
              noEmit: false,
              outDir: "../../../public/tracker/",
              declaration: false,
              // TypeScript 编译优化
              removeComments: true,
              sourceMap: false, // 确保 TypeScript 也不生成 sourcemap
            },
          },
        },
        exclude: /node_modules/,
      },
    ],
  },

  optimization: {
    // 启用极致压缩
    minimize: true,
    concatenateModules: true, // 启用模块串联以获得更好的压缩

    minimizer: [
      new TerserPlugin({
        // Terser 极致压缩配置
        terserOptions: {
          compress: {
            // drop_console: true,        // 移除所有 console
            // drop_debugger: true,       // 移除 debugger
            // pure_funcs: ["console.log"], // 移除特定的函数调用
            unused: true,              // 移除未使用的变量和函数
            dead_code: true,           // 移除死代码
            booleans: true,            // 优化布尔值
            if_return: true,           // 优化 if-return
            // sequences: true,           // 使用逗号操作符连接连续语句
          },
          mangle: {
            toplevel: true,            // 混淆顶级变量和函数名
            keep_fnames: false,        // 不保留函数名
          },
          output: {
            comments: false,           // 移除所有注释
            beautify: false,           // 不美化输出
          },
          ecma: 2015,                  // 指定ECMAScript版本
        },
        extractComments: false,        // 不提取注释到单独文件
      }),
    ],

    // 其他优化选项
    usedExports: true,                  // 标记未使用的导出
    sideEffects: false,                 // 启用tree shaking
  },

  // 性能优化
  performance: {
    // hints: false,                       // 不显示性能提示
  },
};