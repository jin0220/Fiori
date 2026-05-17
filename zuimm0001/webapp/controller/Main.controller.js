sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], (Controller, Fragment, JSONModel) => {
    "use strict";

    return Controller.extend("zuimm0001.controller.Main", {
        onInit() {
            this._oModel = this.getOwnerComponent().getModel();

            let oViewModel = new JSONModel({});
            this.getView().setModel(oViewModel, "view");
            this._oViewMode = oViewModel;
            
        },
        onItemSelect(oEvent) {
            let oListItem = oEvent.getParameter("listItem"); // 클릭한 아이템의 데이터 
            let sPath = oListItem.getBindingContext().getPath();
            let oData = this._oModel.getProperty(sPath);

            let oDialog = sap.ui.getCore().byId("idDialog"); // sap.ui.getCore() : 현재 다이얼로그가 비동기로 로드되기 때문에 UI 전역에서 찾기 위해 사용

            if(oDialog) { // 있으면 true, 없으면 undefined가 리턴됨.
                oDialog.setModel(new JSONModel(oData), "Popup");
                oDialog.open();
                
            }
            else {
                // Fragment는 비동기로 동작
                Fragment.load({
                    name: "zuimm0001.view.fragments.Dialog",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function(oLoadedDialog){ // 로드한 후의 반환값이 인자로 들어옴.
                    oLoadedDialog.setModel(new JSONModel(oData), "Popup");
                    oLoadedDialog.open();
                });
            }
        },
        onClose() {
            // this.byId("idDialog").close(); 하면 동작하지 않음
            // Fragment.load해서 로드한 Dialog는 기존 view의 계층 구조와 분리된 UI 요소로 간주된다.
            // 따라서 view에서 접근하는게 아니라, core에서 접근 해야한다.
            sap.ui.getCore().byId("idDialog").close();
        }
    });
});