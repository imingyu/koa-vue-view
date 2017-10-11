var Vue = require('vue');
const parse = require('./parse.js');
const util = require('./util.js');

var optionsProps = ['methodName', 'cache', 'renderer', 'appendBody'],
    defaultOptions = {
        methodName: 'render',
        appendBody: false,
        cache: process.env.NODE_ENV === 'production',
        renderer: require('vue-server-renderer').createRenderer()
    },
    cacheMap = new Map();

var parseFile = (fileName, isCache) => {
    var result = isCache ? cacheMap.get(fileName) : null;
    if (!result) {
        result = parse(fileName);
        if (isCache) {
            cacheMap.set(fileName, result);
        }
    }
    return result;
}

var registerComponents = (vue, components, cacheParse) => {
    var register = (name, template) => {
        vue.component(name, typeof template === 'string' ? {
            template: template
        } : template)
    }
    for (let name in components) {
        let component = components[name];
        if (typeof component === 'string') {
            if (util.fileIsExist(component)) {
                var spec = parseFile(component, cacheParse);
                register(name, spec.template);
            } else {
                register(name, component);
            }
        } else {
            register(name, component);
        }
    }
}

var PrivateVue = Vue.extend({
    data: {
        privateName: 'koa-vue-view'
    }
});

var registerVue = (vueOptions, cacheParse) => {
    if (vueOptions.path && util.fileIsExist(vueOptions.path)) {
        var spec = parseFile(vueOptions.path, cacheParse);
        delete vueOptions.path;
        vueOptions.template = spec.template;
    }

    if (vueOptions.components) {
        registerComponents(PrivateVue, vueOptions.components, cacheParse);
    }
}



var validData = data => typeof data === 'object' && data != null;

module.exports = function (options) {
    if (typeof options === 'function') {
        options = options(PrivateVue) || {};
    }
    var mixin = Object.assign({}, defaultOptions, options);
    var ops = {};
    for (var prop of optionsProps) {
        ops[prop] = mixin[prop];
        delete mixin[prop];
    }

    registerVue(mixin, ops.cache);

    return function middleware(ctx, next) {
        //TODO:viewVueSpec中的components需要vue.extend化
        ctx[ops.methodName] = function (viewFileName, viewVueSpec) {
            return new Promise((resolve, reject) => {
                var mixins = [mixin];
                if (validData(ctx.state)) {
                    mixins.push({
                        data: ctx.state
                    });
                }
                var inlineComponents;
                if (validData(viewVueSpec)) {
                    mixins.push(viewVueSpec);
                    inlineComponents = viewVueSpec.components;
                    delete viewVueSpec.components;
                }
                var viewSpec = ops.cache ? cacheMap.get(viewFileName) : null;
                if (!viewSpec) {
                    viewSpec = parse(viewFileName);
                    if (ops.cache) {
                        cacheMap.set(viewFileName, viewSpec);
                    }
                }

                var vueApp = new PrivateVue({
                    mixins: mixins,
                    template: viewSpec.template,
                    beforeCreate() {
                        if (inlineComponents) {
                            for (let name in inlineComponents) {
                                let component = inlineComponents[name];
                                if (typeof component === 'string') {
                                    if (util.fileIsExist(component)) {
                                        var spec = parseFile(component, ops.cache);
                                        this.$options.components[name] = PrivateVue.extend({
                                            template: spec.template
                                        })
                                    } else {
                                        this.$options.components[name] = PrivateVue.extend({
                                            template: component
                                        })
                                    }
                                } else {
                                    this.$options.components[name] = component;
                                }
                            }
                        }
                    }
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