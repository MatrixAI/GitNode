import fs from 'fs';
import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default [
  {
    input: 'lib/VirtualGit.js',
    output: {
      file: 'dist/VirtualGit.es.js',
      format: 'es'
    },
    external: (id) => {
      return Object.keys(packageJson.dependencies)
        .map((dep) => new RegExp('^' + dep))
        .concat([/^babel-runtime/])
        .some((pattern) => pattern.test(id));
    },
    plugins: [
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        runtimeHelpers: true,
        plugins: ['transform-object-rest-spread', 'transform-runtime'],
        presets: [
          'flow',
          ['env', {
            modules: false,
            targets: {
              node: '6.0.0'
            }
          }]
        ]
      })
    ]
  },
  {
    input: 'lib/VirtualGit.js',
    output: {
      file: 'dist/VirtualGit.cjs.js',
      format: 'cjs'
    },
    external: (id) => {
      return Object.keys(packageJson.dependencies)
        .map((dep) => new RegExp('^' + dep))
        .concat([/^babel-runtime/])
        .some((pattern) => pattern.test(id));
    },
    plugins: [
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        runtimeHelpers: true,
        plugins: ['transform-object-rest-spread', 'transform-runtime'],
        presets: [
          'flow',
          ['env', {
            modules: false,
            targets: {
              node: '6.0.0'
            }
          }]
        ]
      })
    ]
  },
  {
    input: 'lib/VirtualGit.js',
    output: {
      file: 'dist/VirtualGit-browser.js',
      format: 'umd',
      name: 'VirtualGit'
    },
    plugins: [
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        runtimeHelpers: true,
        plugins: ['transform-object-rest-spread', 'transform-runtime'],
        presets: [
          'flow',
          ['env', {
            modules: false,
            targets: {
              browsers: ['last 2 versions']
            }
          }]
        ]
      }),
      resolve({
        preferBuiltins: false,
        browser: true
      }),
      commonjs()
    ]
  }
];
