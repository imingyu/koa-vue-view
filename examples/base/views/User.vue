<template>
    <Master>
        <ul>
            <li v-for="(item,index) in users" :key="index">{{item.name}} <Age>{{ add(item.age, 1) }}</Age></li>
        </ul>
    </Master>
</template>