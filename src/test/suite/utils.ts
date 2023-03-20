import { it } from "mocha";

export function callItAsync<T extends Object>(
  desc: string,
  data: Array<T>,
  callback: Function
) {
  data.forEach(function (val) {
    it(renderTemplate(desc, val), async () => {
      await callback(val);
    });
  });
}

/*
 * Add value to description
 */
function renderTemplate(template: string, valueRaw: Object) {
  let value = valueRaw.toString();
  try {
    return eval("`" + template + "`;");
  } catch (err) {
    return template;
  }
}
