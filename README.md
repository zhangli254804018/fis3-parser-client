# 提交适合CommonJS模式pc架构 fis3 编译插件 .

集成

- browserify
- browserify-incremental
- partialify
- eslintify
- shimixify
- bundle-collapser

- babelify
- babel-preset-env
- babel-preset-react
- babel-preset-stage-1
- babel-plugin-transform-regenerator
- babel-plugin-transform-runtime
- babel-plugin-transform-object-assign
- babel-plugin-transform-function-bind
- vueify

编译 es2015, react , vue , 支持 babel stage-1 环境
参考来源 fis3-parser-browserify

*项目根目录下必须要有*`package.json`

```javascript



//fis-conf.js

//development 环境 debug：true
fis.once('compile:start', function(file) {
  if (fis.project.currentMedia() != "dev") {
    process.env.NODE_ENV = 'production';
  }else{
    process.env.NODE_ENV = 'development';
  }
});

// 使用

fis.match('app.js',{
  parser: fis.plugin('client'),
  release: 'dist/bundle$1'
});

//可选参数, 高级配置

fis.match('app.js',{
  parser: fis.plugin('client',{
    option:{
      shims:{ //设置垫片
        'react':'window.React',
        'react-dom' :'window.ReactDOM',
        'react-router': 'window.ReactRouter',
        'antd': 'window.antd'
      },
      requires: [
        {path:'jQuery', expose: 'jQuery'}   //暴露内部模块 方便 外部js var $ = require('jQuery')
      ],
      externals: ['react', 'reactDOM', 'vue'], //申明外部模块, 不打包入app.js
      externalRequireName: 'req', // 外部引用模块方法名, 默认: require 设置为req后 require 外部模块:  var $ = req('jQuery');
      umd: 'app'  // 默认undfined ,  设置名字后 .umd打包  单独引用的时候, 可以访问 window.app 
    }
  })
});








```
