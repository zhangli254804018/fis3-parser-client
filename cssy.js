'use strict';
var path = require("path");
var through = require('through2');
var assign = require('lodash').assign;

var postcss = require('postcss');
var less = require('less');
var safe = require('postcss-safe-parser');
var sorting = require('postcss-sorting');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');

var func_start = "(function() { var head = document.getElementsByTagName('head')[0]; var style = document.createElement('style'); style.type = 'text/css';",
  func_end = "if (style.styleSheet){ style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); } head.appendChild(style);}())";

var defaultOptions = {
  compileOptions: {
    compress: true
  }
};


var currentWorkingDir = process.cwd();
var packageConfig;
try {
  packageConfig = require(currentWorkingDir + "/package.json");
} catch (e) {
  packageConfig = undefined;
}

var packagePluginOptions = packageConfig &&
  packageConfig.browserify &&
  packageConfig.browserify["transform-packageConfig"] &&
  packageConfig.browserify["transform-packageConfig"]["node-lessify"];


module.exports = function(file, transformOptions) {
  var pathInfo = path.parse(file);

  if (!/\.css$|\.less$|\.cssm$|\.lessm$/.test(file)) {
    return through();
  }

  // set the curTransformOptions using the given plugin options
  var curTransformOptions = assign({}, defaultOptions, packagePluginOptions || {}, transformOptions || {});
  curTransformOptions._flags = undefined; // clear out the _flag property


  var buffer = "",
    myDirName = path.dirname(file);

  var compileOptions = assign({}, curTransformOptions.compileOptions || {}, {
    paths: [".", myDirName] // override the "paths" property
  });

  return through(write, end);

  function write(chunk, enc, next) {
    buffer += chunk.toString();
    next();
  }

  function end(done) {
    var self = this;

    var postcssPlus = [
      sorting(),
      autoprefixer({ browsers: ['> 1%', 'iOS 7'] }),
      cssnano()
    ];

    var cssname = {};


    if (/\.cssm$|\.lessm$/.test(file)) {
      postcssPlus.push(require('postcss-modules')({
        getJSON: function(cssFileName, json) {
          cssname = json;
        }
      }));
    }

    function css(cssContent){
      return postcss(postcssPlus).process(cssContent, {annotation: false, parser: safe});
    }

    function isInline(url) {
      return /[?&]__inline(?:[=&'"]|$)/.test(url);
    }

    function img(cssContent){
      var reg = /(\/\*[\s\S]*?(?:\*\/|$))|(?:@import\s+)?\burl\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^)}\s]+)\s*\)(\s*;?)|\bsrc\s*=\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|[^\s}]+)/g;
      var _ = fis.util;
      var fileW = fis.file(file);
      cssContent = cssContent.replace(reg, function(m, comment, url, last, filter){
        // console.log(m,url,last);
        if (m.indexOf('@') === 0) {
            return m;
        }
        if (url) {
          var quote = _.stringQuote(url);

          if(/^(data:)|(https:\/\/)|(http:\/\/)/.test(quote.rest)){
            return m;
          }

          var info = _.query(quote.rest);

          if(path.isAbsolute(info.rest)){
            info = fis.uri(info.rest);
          }else{
            info = fis.project.lookup(info.rest, file);
          }

          var _file = info.file;

          if(!_file){
            fis.log.warn(file,':', url , 'is not exist');
          }else{
            _file.getContent();

            if(isInline(url)){
              m = 'url("'+ _file.getBase64() +'")';
            }else{
              m = 'url('+ _file.domain + _file.getHashRelease() +')';
            }
          }
        }

        return m;
      });
      // console.log(cssContent);
      return cssContent;
    }

    function outputHandler(output){
      output.css = img(output.css);
      var compiled = JSON.stringify(
        output.css +
        (curTransformOptions.appendLessSourceUrl ?
          '/*# sourceURL=' + path.relative(currentWorkingDir, file).replace(/\\/g, '/') + ' */' : '')
      );
      if (/\.css$|\.less$/.test(file)) {
        if (curTransformOptions.textMode) {
          compiled = "module.exports = " + compiled + ";";
        } else {
          compiled = func_start + "var css = " + compiled + ";" + func_end;
        }
      } else {
        compiled = func_start + "var css = " + compiled + ";" + "module.exports = " + JSON.stringify(cssname) + ";" + func_end;
      }

      self.push(compiled);
      self.push(null);
      done();
    }


    if (/\.css$|\.cssm$/.test(file)) {
      return css(buffer).then(outputHandler);
    }

    less.render(buffer, compileOptions, function(err, result) {
      if (err) {
        var msg = err.message;
        if (err.line) {
          msg += ", line " + err.line;
        }
        if (err.column) {
          msg += ", column " + err.column;
        }
        if (err.extract) {
          msg += ": \"" + err.extract + "\"";
        }

        return done(new Error(msg, file, err.line));
      }

      result.imports.forEach(function(f) {
        self.emit('file', f);
      });

      css(result.css).then(outputHandler);

    });

  }
};
