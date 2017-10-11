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

var KoaVue = Vue.extend({
    data() {
        return {
            name: 'KoaVue'
        }
    }
});

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

var convertComponent = (spec, isCache) => {
    var result = {};
    if (typeof spec === 'string') {
        if (util.fileIsExist(spec)) {
            result.path = spec;
            result.parseResult = parseFile(spec, isCache);
            result.template = result.parseResult.template;
        } else {
            result.template = spec;
        }
    } else if (typeof spec === 'object') {
        if (spec.converted) {
            result = spec;
        } else {
            Object.assign(result, spec);
            if (!result.template && !result.path) {
                result = null;
            } else if (!result.template) {
                result.parseResult = parseFile(result.path, isCache);
                result.template = result.parseResult.template;
            }
            if (result.data && typeof result.data === 'object') {
                var oldData = result.data;
                result.data = function () {
                    return oldData;
                }
            }
            result.converted = true;
        }
    }
    return result;
}

var registerComponents = (vue, vueOptions, cacheParse, isVueInstance) => {
    var components = vueOptions.components;
    delete vueOptions.components;

    for (let name in components) {
        let component = convertComponent(components[name], cacheParse);
        if (vueOptions.data) {
            component.mixins = component.mixins || [];
            component.mixins.push({
                data() {
                    return typeof vueOptions.data === 'function' ? vueOptions.data.call(this) : vueOptions.data;
                }
            })
        }
        if (isVueInstance) {
            vue.$options.components[name] = KoaVue.extend(component);
        } else {
            vue.component(name, component);
        }
    }
}

var registerVue = (vueOptions, cacheParse) => {
    if (vueOptions.components) {
        registerComponents(KoaVue, vueOptions, cacheParse);
    }
    if (vueOptions.filters) {
        for (let filter in vueOptions.filters) {
            KoaVue.filter(filter, vueOptions.filters[filter]);
        }
        delete vueOptions.filters;
    }
    if (vueOptions.directives) {
        for (let directive in vueOptions.directives) {
            KoaVue.directive(directive, vueOptions.directives[directive]);
        }
        delete vueOptions.directives;
    }
}



var validData = data => typeof data === 'object' && data != null;

module.exports = function (options) {
    if (typeof options === 'function') {
        options = options(KoaVue) || {};
    }
    var mixin = Object.assign({}, defaultOptions, options);
    var ops = {};
    for (var prop of optionsProps) {
        ops[prop] = mixin[prop];
        delete mixin[prop];
    }

    if (typeof mixin.data === 'object') {
        var oldData = mixin.data;
        mixin.data = function () {
            return oldData;
        }
    }

    registerVue(mixin, ops.cache);

    return function middleware(ctx, next) {
        ctx.KoaVue = KoaVue;
        ctx[ops.methodName] = function (viewSpec) {
            return new Promise((resolve, reject) => {
                var mixins = [mixin];
                if (validData(ctx.state)) {
                    mixins.push({
                        data: ctx.state
                    });
                }
                viewSpec = convertComponent(viewSpec, ops.isCache);
                viewSpec.name = viewSpec.name || 'KoaVueApp';
                viewSpec.mixins = viewSpec.mixins || [];
                viewSpec.mixins = mixins.concat(viewSpec.mixins);

                var inlineComponents = viewSpec.components;
                delete viewSpec.components;
                viewSpec.beforeCreate = function () {
                    if (inlineComponents) {
                        registerComponents(this, {
                            components: inlineComponents
                        }, ops.isCache, true);
                    }
                }

                ops.renderer.renderToString(new KoaVue(viewSpec), (err, html) => {
                    if (err) {
                        reject(err);
                    } else {
                        if(viewSpec.parseResult){
                            html = (viewSpec.parseResult.header || '') + html + (viewSpec.parseResult.footer || '');
                        }
                        
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