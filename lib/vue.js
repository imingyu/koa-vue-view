var Vue = require('vue');
var util = require('./util.js');
var parse = require('./parse.js');
//Vue.compile()
module.exports = function (mixin) {
    var spec = {
        components: {}
    };
    if (mixin.components) {
        var components = mixin.components;
        delete mixin.components;
        for (let name in components) {
            var path = components[name];
            if (util.isExist(path)) {
                var template = parse(path).template;
                spec.components[name] = Vue.extend({
                    mixins: [mixin],
                    template: template,
                    beforeCreate() {
                        for (let comName in spec.components) {
                            let comSpec = spec.components[comName];
                            this.$options.components.comName = comSpec;
                        }
                    }
                })
            }
        }
    }
    if (mixin.filters) {
        spec.filters = mixin.filters;
        delete mixin.filters;
    }
    if (mixin.directives) {
        spec.directives = mixin.directives;
        delete mixin.directives;
    }
    return Vue.extend(spec);
}