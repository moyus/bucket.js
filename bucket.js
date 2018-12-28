;(function (window, document) {
  'use strict';

  var headEl = document.head || document.getElementsByTagName('head')[0];

  /**
   * 下载远程资源
   * @param  {string}   url      资源地址
   * @param  {Function} callback 回调
   */
  function get(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if ((xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) && xhr.responseText) {
          callback(null, {
            content: xhr.responseText,
            type: xhr.getResponseHeader('content-type')
          });
        } else {
          callback(new Error(xhr.statusText))
        }
      }
    }

    setTimeout(function () {
      if (xhr.readyState < 4) {
        xhr.abort();
      }
    }, bucket.timeout);

    xhr.send();
  }

  /**
   * 下载并保存资源到localStorage
   * @param  {object} resource 资源信息
   * @param  {Function} callback 回调
   */
  function save(resource, callback) {
    get(resource.url, function (err, res) {
      if (err) {
        return callback(err)
      }
      var result = {
        content: res.content,
        type: res.type,
        stamp: Date.now(),
        unique: resource.unique,
        expire: Date.now() + (resource.expire || bucket.expire) * 60 * 60 * 1000
      }

      if (resource.cache) {
        addLocalStorage(resource.key, result)
      }

      callback(null, result)
    })
  }

  /**
   * 保存数据到localStorage
   * @param {string} key  唯一键名
   * @param {object} data 数据
   */
  function addLocalStorage(key, data) {
    try {
      localStorage.setItem(bucket.prefix + key, JSON.stringify(data))
    } catch (e) {
      // 超出可缓存的大小限制
      if ( e.name.toUpperCase().indexOf('QUOTA') >= 0 ) {
        var shouldClear;
        for (var item in localStorage) {
          if (item.indexOf(bucket.prefix) === 0) {
            shouldClear = true;
            break;
          }
        }

        if (shouldClear) {
          window.bucket.clear();
          addLocalStorage(key, data);
        }
      }
    }
  }

  /**
   * 注入脚本到页面
   * @param  {object} data
   */
  function inject(data) {
    if (/javascript/.test(data.type)) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.defer = true;
      script.crossorigin = 'anonymous';
      script.text = data.content;
      headEl.appendChild(script);
    } else if (/css/.test(data.type)) {
      var style = document.createElement('style');
      style.innerText = data.content;
      headEl.appendChild(style);
    }
  }

  /**
   * 检测资源是否过期
   * @param  {object}  source
   * @param  {object}  resource
   * @return {Boolean}
   */
  function isCacheInvalid(source, resource) {
    return !source || source.unique !== resource.unique || source.expire < Date.now()
  }

  /**
   * 处理资源
   * @param  {object}   resource
   * @param  {Function} callback
   */
  function handle(resource, callback) {
    var source, shouldFetch;
    if (!resource.url) {
      return callback(new Error('url不能为空'));
    }

    source = bucket.get(resource.key);
    shouldFetch = isCacheInvalid(source, resource);
    if (shouldFetch) {
      save(resource, function (err, result) {
        if (err) {
          return callback(err);
        }
        callback(null, result);
      });
    } else {
      callback(null, source);
    }
  }

  /**
   * 异步队列操作资源
   * @param  {array}   resources
   * @param  {Function} callback
   */
  function queue(resources, callback) {
    var count = resources.length;
    var stack = new Array(resources.length);

    function checkStack() {
      for (var i = 0, len = stack.length; i < len; i++) {
        if (!stack[i]) {
          break;
        } else if(stack[i].executed !== true) {
          inject(stack[i]);
          stack[i].executed = true;
        }
      }
    }

    for (var i = 0, len = resources.length; i < len; i++) {
      (function (i) {
        handle(resources[i], function (err, source) {
          --count;
          if (err) {
            if (callback.called !== true) {
              callback.called = true;
              callback(err)
            }
          } else {
            stack[i] = source;
            checkStack();
            if (count <= 0 && callback.called !== true) {
              callback.called = true;
              callback(null, stack);
            }
          }
        })
      })(i);
    }
  }

  var bucket = window.bucket = {
    timeout: 10000,
    expire: 24 * 7,
    prefix: 'bucket-',
    require: function (resources, callback) {
      resources = resources.reduce(function (acc, item) {
        if (!item.url) {
          return acc;
        }

        item.cache = item.cache !== false;
        item.key = item.key || item.url
        item.unique = item.unique || item.url
        acc.push(item)

        return acc
      }, []);

      queue(resources, function (err, items) {
        if (typeof callback === 'function') {
          callback(err, items);
        }
      });

      return this;
    },
    get: function (key) {
      var item = localStorage.getItem(bucket.prefix + key);
      try {
        return JSON.parse(item);
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      localStorage.removeItem(bucket.prefix + key);

      return this;
    },
    clear: function () {
      for (var item in localStorage) {
        var key = item.split(bucket.prefix)[1];
        if (key) {
          this.remove(key);
        }
      }

      return this;
    }
  }
})(window, document);
