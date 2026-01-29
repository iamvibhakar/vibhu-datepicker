import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/datepicker.umd.js',
      format: 'umd',
      name: 'VibhuDatepicker'
    },
    {
      file: 'dist/datepicker.esm.js',
      format: 'es'
    }
  ],
  plugins: [
    postcss({
      extract: 'datepicker.css',
      minimize: true
    })
  ]
};
