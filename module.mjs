// @ts-check
import { module } from "@prisma/composer";
import webService from "./apps/web/service.mjs";

export default module("web", ({ provision }) => {
  provision(webService);
});
