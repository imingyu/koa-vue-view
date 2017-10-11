var path = require('path');
var Koa = require('koa');
var VueView = require('../../lib/index.js');

var app = new Koa();
app.use(VueView({
    methodName: 'render',
    data: {
        //_: require('lodash'),
        app: {
            name: 'Github',
            version: '1.0.0'
        }
    },
    methods: {
        add(a, b) {
            return a + b;
        }
    },
    components: {
        Master: {
            path: path.resolve(__dirname, './views/Master.vue'),
            data() {
                this.layoutVersion = '1.0.0';
                return {
                    layoutName: 'master'
                }
            },
            methods: {
                hight(str) {
                    return `***${str}***`;
                }
            }
        },
        Age: path.resolve(__dirname, './components/Age.vue')
    }
}));

app.use(function* (next) {
    var ctx = this;
    ctx.state.users = [{
        name: 'Tom',
        age: 20
    }, {
        name: 'Alice',
        age: 18
    }];
    ctx.render(path.resolve(__dirname, './views/User.vue'));
})

app.on('error', (err, ctx) => {
    ctx.body = 'sdf：' + err.message;
})

app.listen(8200);