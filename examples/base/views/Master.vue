<template>
    <html lang="zh-CN">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>{{hight(app.name)}} - {{app.version}}</title>
        <slot name="meta"></slot>
    </head>

    <body>
        <h1>{{layoutName}} - {{layoutVersion}}</h1>
        <slot name="top"></slot>
        <slot></slot>
        <slot name="bottom"></slot>
    </body>

    </html>
</template>