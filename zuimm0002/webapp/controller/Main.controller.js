sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Fragment, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("zuimm0002.controller.Main", {
        onInit() {
            this._oModel = this.getOwnerComponent().getModel();

            let oJSONModelMain = new JSONModel({});
            this.getView().setModel(oJSONModelMain, "PRSet");

            this._oModel.read("/PRSet", {
                success: function (oData) {
                    oJSONModelMain.setData(oData.results);
                },
                error: function (oError) {
                    console.error("OData 읽기 실패: ", oError);
                }

            });
        },
        onItemSelect(oEvent) {
            let oListItem = oEvent.getParameter("listItem"); // 클릭한 아이템의 데이터 
            let sPath = oListItem.getBindingContext("PRSet").getPath();
            let oData = this.getView().getModel("PRSet").getProperty(sPath);

            console.log(oData.Banfn);

            let oRouter = this.getOwnerComponent().getRouter();

            // Parameter 1 : 이동할 대상 routes의 name, manifest.json에서 설정한 값
            // Parameter 2 : 화면 이동 시 전달할 파라미터들 지정, param1은 필수값
            // Parameter 3 : route 히스토리 초기화 여부(생략가능), false는 뒤로가기 가능.
            oRouter.navTo("RouteDetail", {
                banfn: oData.Banfn,
                bnfpo: oData.Bnfpo
            }, false)

        }
    });
});