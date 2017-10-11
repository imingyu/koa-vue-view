var fs = require('fs')
exports.readFile = fileName => {
    return fs.readFileSync(fileName, {
        encoding: 'utf8'
    });
}
exports.fileIsExist = fileName => {
    return fs.existsSync(fileName);
}
exports.error = message => {
    return new Error(`[koa-vue-view]${message}`);
}