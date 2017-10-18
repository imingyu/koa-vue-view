var path = require('path');
var Koa = require('koa');
var VueView = require('../../lib/index.js');

var app = new Koa();
app.use(VueView({
    replaceBody: false,
    methodName: 'rd1',
    data: {
        msg: 'rd1'
    },
    components: {
        com: path.resolve(__dirname, './components/rd1.vue')
    }
}));
app.use(VueView({
    replaceBody: false,
    methodName: 'rd2',
    data: {
        msg: 'rd2'
    },
    components: {
        com: path.resolve(__dirname, './components/rd2.vue')
    }
}));
app.use((ctx, next) => {
    return Promise.all([ctx.rd1(path.resolve(__dirname, './views/more.vue')), ctx.rd2(path.resolve(__dirname, './views/more.vue'))]).then(([h1, h2]) => {
        ctx.body = (h1 + '').trim() + (h2 + '').trim();
        next(ctx);
    }).catch(error => {
        ctx.throw(error);
    })
})

app.listen(8200);