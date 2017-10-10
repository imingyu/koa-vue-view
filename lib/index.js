var compose = require('koa-compose');
const createVue = require('./vue')
const parse = require('./parse.js');
var optionsProps = ['methodName', 'cache', 'renderer', 'appendBody'],
    defaultOptions = {
        methodName: 'render',
        appendBody: false,
        cache: process.env.NODE_ENV === 'production',
        renderError(h, err) {
            return h('pre', { style: { color: 'red' } }, err.stack);
        },
        renderer: require('vue-server-renderer').createRenderer()
    },
    cacheMap = new Map();

var validData = data => typeof data === 'object' && data != null;


module.exports = function (options) {
    var mixin = Object.assign({}, defaultOptions, options);
    var ops = {};
    for (var prop of optionsProps) {
        ops[prop] = mixin[prop];
        delete mixin[prop];
    }

    var oldData = mixin.data;
    mixin.data = function () {
        return oldData || {}
    }
    var Vue = createVue(mixin);

    return function middleware(ctx, next) {
        ctx[ops.methodName] = function (viewFileName, data) {
            return new Promise((resolve, reject) => {
                var mixins = [mixin];
                if (validData(ctx.state)) {
                    mixins.push({
                        data() {
                            return ctx.state
                        }
                    });
                }
                if (validData(data)) {
                    mixins.push({
                        data() {
                            return data;
                        }
                    });
                }
                var viewSpec = ops.cache ? cacheMap.get(viewFileName) : null;
                if (!viewSpec) {
                    viewSpec = parse(viewFileName);
                    if (ops.cache) {
                        cacheMap.set(viewFileName, viewSpec);
                    }
                }

                var vueApp = new Vue({
                    mixins: mixins,
                    template: viewSpec.template
                })
                ops.renderer.renderToString(vueApp, (err, html) => {
                    if (err) {
                        console.log(`${viewSpec.path}渲染出错！`)
                        console.error(err);
                        reject(err);
                    } else {
                        html = (viewSpec.header || '') + html + (viewSpec.footer || '');
                        if (ops.appendBody) {
                            ctx.body += html;
                        } else {
                            ctx.body = html;
                        }
                        resolve(html);
                    }
                })
            })

        }
        return next();
    }
}