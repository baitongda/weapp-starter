const config = require('../common/config');
const queueRequest = require('./lib/queue-request').queueRequest;

function getToken() {
  let token;
  if (!token) {
    token = wx.getStorageSync('token');
  }
  return token;
}

const request = function(option) {
  const method = option.method || 'GET';
  const url = `${config.api}${option.url}`;
  let _timeFormat = 'YYYY-MM-DD HH:mm:ss';
  if (option.timeFormat) {
    _timeFormat = option.timeFormat;
  }
  const _data = Object.assign({}, option.data, { _timeFormat, _fromNow: '2d' });
  const token = getToken();
  const header = Object.assign({}, {
    'x-hdk-token': token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }, option.header);
  return new Promise((resolve, reject) => {
    queueRequest(wx.request, 5)({
      url,
      data: _data,
      header,
      method,
      success: (res) => {
        let data = res.data || {};
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            reject(data);
          }
          return;
        }
        const code = data.code;
        const msg = data.msg;
        console.log('\n', `${method}: ${url}`, _data, header, '\nRES:', res, '\n'); // eslint-disable-line
        if (`${code}` === '0') {
          resolve(data);
        } else {
          wx.showToast({
            title: msg
          });

          // 假设需要登录的情况:
          if (`${code}` === '6') {
            wx.removeStorageSync('token');
          }
          reject({
            errMsg: `${msg}(${code})`,
          });
        }
      },
      fail: reject,
      complete: reject
    });
  });
};

const uploadFile = function(option) {
  const url = `${config.api.default}${option.url}`;
  const _data = Object.assign({}, option.data, { timeFormat: 'YYYY-MM-DD HH:mm:ss' });
  const token = getToken();
  const header = Object.assign({}, {
    'x-hdk-token': token,
    'Accept': 'application/json',
    'Content-Type': 'multipart/form-data',
  }, option.header);
  return queueRequest(this.uploadFile, 5)({
    url,
    filePath: option.filePath,
    name: option.name || 'file',
    header,
    formData: _data,
    success: (res) => {
      let data = res.data;
      if (typeof data === 'string') {
        try {
          // 处理javascript不能解析的特殊字符
          // 下面这两行替换代码在小程序开发者工具上生效
          // 但是，在真机上不生效，在服务器 node 环境下也能生效
          // 所以，建议把这两行代码告知服务器开发，添加到服务器上去
          // 防止特殊字符导致 JSON 解析失败的苦恼
          data = data.replace(/[\u00a0\ufeff]/g, '');
          data = data.replace(/[\u2028\u2029]/g, '\\n');
          
          data = JSON.parse(data);
        } catch (error) {
          if (option.fail instanceof Function) {
            option.fail({
              errMsg: '上传文件失败',
            });
          }
          return;
        }
      }
      const code = data.code;
      const msg = data.msg;
      console.log('\n', `upload: ${url}`, option, '\nRES:', res, '\n'); // eslint-disable-line
      if (`${code}` === '0') {
        if (option.success instanceof Function) {
          option.success(data);
        }
      } else {
        this.showToast({
          title: msg
        });
        if (option.fail instanceof Function) {
          option.fail({
            errMsg: `${msg}(${code})`,
          });
        }
      }
    },
    fail: (err) => {
      if (option.fail instanceof Function) {
        option.fail(err);
      }
    },
    complete: (rst) => {
      if (option.complete instanceof Function) {
        option.complete(rst);
      }
    }
  }, resultTask => {
    typeof option.callback === 'function' && option.callback(resultTask);
  });
};

module.exports = {
  request,
  uploadFile
};
