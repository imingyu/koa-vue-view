# koa-vue-view
A Koa view engine which renders Vue components on server.

# 需求
我熟悉书写vue的代码，感觉她的语法很简洁明了，并且支持组件化；我最近在学习使用koa编写node web应用，在koa框架中渲染视图有很多选择；但是我想在koa中使用vue来渲染视图；
我在调研了vue的ssr解决方案后，感觉她很好，但是不满足我的需求，我只是想用她的语法和组件化来实现视图渲染，渲染的数据想从koa的`ctx.state`中读取，也不想前后端同用同一套路由这种方式；
所以我觉得用vue的ssr的基础部分——服务端渲染vue实例，来完成我的需求，即此中间件诞生；

# 安装
```bash
npm i -S koa-vue-view
```

# 使用
```html
<!--模板： ./views/Master.vue -->
<!DOCTYPE html>
<template>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>{{app.name}} - {{app.version}}</title>
    <slot name="meta"></slot>
</head>
<body>
    <slot name="top"></slot>
    <slot></slot>
    <slot name="bottom"></slot>
</body>
</html>
</template>

<!--组件： ./components/Age.vue -->
<template>
    <strong style="color:red;">
        <slot></slot>
    </strong>
</template>


<!--页面： ./views/User.vue -->
<template>
    <Master>
        <ul>
            <li v-for="(item,index) in users" :key="index">{{item.name}} <Age>{{ add(item.age, 1) }}</Age></li>
        </ul>
    </Master>
</template>
```

```javascript
var path = require('path');
var Koa = require('koa');
var VueView = require('koa-vue-view');

var app = new Koa();
app.use(VueView({
    methodName: 'render',
    data: {
        _: require('lodash'),
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
        Master: path.resolve(__dirname, './views/Master.vue'),
        Age: path.resolve(__dirname, './components/Age.vue')
    }
}));

app.use(ctx => {
    ctx.state.users = ['Tom', 'Jeck'];
    ctx.render(path.resolve(__dirname, './views/User.vue'));
});

app.listen(8200);
```