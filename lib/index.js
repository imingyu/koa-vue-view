var Vue = require('vue');
const parse = require('./parse.js');
const util = require('./util.js');

var optionsProps = ['methodName', 'cache', 'renderer', 'appendBody', 'replaceBody', 'filterHtml'],
    defaultOptions = () => {
        return {
            methodName: 'render',
            appendBody: false,
            replaceBody: true,
            cache: process.env.NODE_ENV === 'production',
            renderer: require('vue-server-renderer').createRenderer()
        }
    },
    cacheMap = new Map();

var createKey = () => {
    return (Math.random() + '').replace('0.', '');
}

var parseFile = (fileName, vueKey, isCache) => {
    var result = isCache ? cacheMap.get(vueKey + '+' + fileName) : null;
    if (!result) {
        result = parse(fileName);
        if (isCache) {
            cacheMap.set(vueKey + '+' + fileName, result);
        }
    }
    return result;
}

var convertComponent = (spec, vueKey, isCache) => {
    var result = {};
    if (typeof spec === 'string') {
        if (util.fileIsExist(spec)) {
            result.path = spec;
            result.parseResult = parseFile(spec, vueKey, isCache);
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
                result.parseResult = parseFile(result.path, vueKey, isCache);
                result.template = result.parseResult.template;
            }
            result.converted = true;
        }
    }
    return result;
}

var inlineComponents = (component, compiledComponents) => {
    component.components = component.components || {};
    for (let name in compiledComponents) {
        if (!component.components[name]) {
            component.components[name] = compiledComponents[name];
        }
    }
}

var registerComponents = (vue, vueOptions, cacheParse, isVueInstance) => {
    var components = vueOptions.components;
    delete vueOptions.components;

    var compiledComponents = {};

    for (let name in components) {
        let component = convertComponent(components[name], vueOptions.key || vue.key, cacheParse);
        inlineComponents(component, compiledComponents);

        compiledComponents[name] = component;

        if (vueOptions.data) {
            var oldData = vueOptions.data;
            component.mixins = component.mixins || [];
            component.mixins = [{
                data() {
                    return typeof oldData === 'function' ? oldData.call(this) : oldData;
                }
            }].concat(component.mixins);
        }
        if (isVueInstance) {
            vue.$options.components[name] = component;
        } else {
            vue.component(name, component);
        }
    }
}

var registerVue = (vue, vueOptions, cacheParse) => {
    if (vueOptions.components) {
        registerComponents(vue, vueOptions, cacheParse);
    }
    if (vueOptions.filters) {
        for (let filter in vueOptions.filters) {
            vue.filter(filter, vueOptions.filters[filter]);
        }
        delete vueOptions.filters;
    }
    if (vueOptions.directives) {
        for (let directive in vueOptions.directives) {
            vue.directive(directive, vueOptions.directives[directive]);
        }
        delete vueOptions.directives;
    }
}

var validData = data => typeof data === 'object' && data != null && Object.keys(data).length > 0;

var VueView = function (options) {
    var KoaVue = Vue.extend({
        data() {
            return {}
        }
    });

    if (typeof options === 'function') {
        options = options(KoaVue) || {};
    }
    var mixin = Object.assign({}, defaultOptions(), options);
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

    KoaVue.mid = 'KoaVueFor' + ops.methodName;
    KoaVue.key = createKey();

    registerVue(KoaVue, mixin, ops.cache);

    return function middleware(ctx, next) {
        ctx[ops.methodName] = function (viewSpec) {
            return new Promise((resolve, reject) => {
                var mixins = [mixin];
                if (validData(ctx.state)) {
                    mixins.push({
                        data() {
                            return ctx.state;
                        }
                    });
                }
                viewSpec = convertComponent(viewSpec, KoaVue.key, ops.isCache);
                viewSpec.name = viewSpec.name || 'KoaVueApp';
                viewSpec.mixins = viewSpec.mixins || [];
                viewSpec.mixins = mixins.concat(viewSpec.mixins);

                var inlineComponents = viewSpec.components;
                delete viewSpec.components;
                viewSpec.beforeCreate = function () {
                    this.$$mid = KoaVue.mid;
                    if (inlineComponents) {
                        registerComponents(this, {
                            key: KoaVue.key,
                            components: inlineComponents,
                            data: mixin.data
                        }, ops.isCache, true);
                    }
                }
                var instance = new KoaVue(viewSpec);

                ops.renderer.renderToString(instance, (err, html) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (viewSpec.parseResult) {
                            html = (viewSpec.parseResult.header || '') + html + (viewSpec.parseResult.footer || '');
                        }
                        html = typeof ops.filterHtml === 'function' ? ops.filterHtml(html) : html;
                        if (ops.replaceBody) {
                            if (ops.appendBody) {
                                ctx.body += html;
                            } else {
                                ctx.body = html;
                            }
                        }
                        resolve(html);
                    }
                })
            })
        }
        return next();
    }
}
module.exports = VueView;