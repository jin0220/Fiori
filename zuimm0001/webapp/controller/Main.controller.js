sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Fragment, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("zuimm0001.controller.Main", {
        onInit() {
            // test
            this._oModel = this.getOwnerComponent().getModel();

            this._aUniqueMaterials = [];
            this._oModel.read("/MStockSet", {
                success: function (oData) {
                    let aResults = oData.results;

                    this._oMStockSet = aResults;
                    let oJSONModelMain = new JSONModel(aResults);
                    oJSONModelMain.setSizeLimit(500);
                    this.getView().setModel(oJSONModelMain, "MStockSet");

                    this._updateChartData();

                    let aUniqueMaterials = aResults.filter((item, index, self) =>
                        index === self.findIndex((t) => t.Matnr === item.Matnr)
                    );

                    let oJSONModel = new JSONModel(aUniqueMaterials);
                    this.getView().setModel(oJSONModel, "MaterialSet");

                    this._aUniqueMaterials = aUniqueMaterials;

                }.bind(this),
                error: function (oError) {
                    console.error("데이터 조회 실패: ", oError);
                }
            });

            this._werksSet = [];
            this._oModel.read("/WerksSet", {
                success: function (oData) {

                    this._werksSet = oData.results;

                }.bind(this),
                error: function (oError) {
                    console.error("데이터 조회 실패: ", oError);
                }
            });

            this._lgortSet = [];
            this._oModel.read("/LgortSet", {
                success: function (oData) {

                    this._lgortSet = oData.results;

                }.bind(this),
                error: function (oError) {
                    console.error("데이터 조회 실패: ", oError);
                }
            });
        },
        // onAfterRendering: function () {
        //     // 1. 내 FilterBar 객체 가져오기
        //     var oFilterBar = this.byId("idFilterBar"); 
            
        //     if (oFilterBar) {
        //         // 2. FilterBar 내부에 숨겨져 있는 표준 [Go] 버튼 객체 찾아오기
        //         var oGoButton = oFilterBar._oSearchButton; 
        //         if (oGoButton) {
        //             // 3. 버튼 텍스트를 강제로 "조회"로 세팅!
        //             oGoButton.setText("조회"); 
        //         }

        //         var oAdaptButton = oFilterBar._oFiltersButton;
        //         if (oAdaptButton) {
        //             oAdaptButton.setText("필터 적용"); // 샘플처럼 '필터 적용' 혹은 '필터 선택'으로 세팅
        //         }
        //     }
        // },
        onItemSelect(oEvent) {
            let oListItem = oEvent.getParameter("listItem"); // 클릭한 아이템의 데이터 
            let sPath = oListItem.getBindingContext("MStockSet").getPath();
            let oData = this.getView().getModel("MStockSet").getProperty(sPath);

            if (oData.Matnr.substr(0, 2) !== "RM") { // 원자재만 구매요청 가능하도록 조건 걸기 (자재코드가 "RM"으로 시작하는 경우만)
                return;
            }
            //============================================================================
            // 구매요청 생성 팝업
            //============================================================================
            let oDialog = sap.ui.getCore().byId("idDialog"); // sap.ui.getCore() : 현재 다이얼로그가 비동기로 로드되기 때문에 UI 전역에서 찾기 위해 사용
            let fnOpenDialog = () => {
                // 문서 유형 콤보박스 데이터 세팅
                let oBsartData = {
                    "Types": [
                        { "key": "ZNB", "text": "ZNB (표준 오더)" },
                        { "key": "ZUB", "text": "ZUB (재고 운송 오더)" },
                        { "key": "ZRO", "text": "ZRO (반품 구매 오더)" }
                    ]
                };
                let oBsartModel = new JSONModel(oBsartData);

                if (oDialog) { // 있으면 true, 없으면 undefined가 리턴됨.
                    oDialog.open();

                }
                else {
                    // Fragment는 비동기로 동작
                    Fragment.load({
                        name: "zuimm0001.view.fragments.Dialog",
                        type: "XML",
                        controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                    }).then(function (oLoadedDialog) { // 로드한 후의 반환값이 인자로 들어옴.
                        oLoadedDialog.setModel(new JSONModel(oData), "Popup");
                        oLoadedDialog.setModel(oBsartModel, "BsartModel");
                        oLoadedDialog.open();
                    });
                }
            };

            //============================================================================
            // 가용 재고가 충분한 경우 구매요청 생성 전 알림창을 띄워 요청생성 여부를 다시 확인
            //============================================================================
            let iAvailableStock = Number(oData.Labst || 0); // 가용재고
            let iSafetyStock = Number(oData.Eisbe || 0); // 안전재고
            if (iAvailableStock <= iSafetyStock) {
                // 케이스 1: 재고 부족/위험 -> 즉시 팝업 오픈
                fnOpenDialog();
            } else {
                // 케이스 2: 정상 재고 -> MessageBox로 한 번 더 확인 후 오픈
                sap.m.MessageBox.confirm("현재 가용재고가 안전재고보다 충분합니다.\n그래도 구매요청(PR)을 생성하시겠습니까?", {
                    title: "구매요청 확인",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.YES) {
                            fnOpenDialog();
                        }
                    }
                });
            }
        },
        onSavePR() {
            let matnr = sap.ui.getCore().byId("txtMatnr").getText();
            let werks = sap.ui.getCore().byId("txtWerks").getText();
            let lgort = sap.ui.getCore().byId("txtLgort").getText();
            let bsart = sap.ui.getCore().byId("idComboBsart").getSelectedKey();
            let menge = sap.ui.getCore().byId("idInputReqQty").getValue();
            let lfdat = sap.ui.getCore().byId("idDatePickerBadat").getDateValue(); // 오늘 날짜 (YYYY-MM-DD)

            this._oModel.create("/PRSet", {
                Matnr: matnr,
                Werks: werks,
                Lgort: lgort,
                Bsart: bsart,
                Menge: menge,
                Lfdat: lfdat
            }, {
                success: () => {
                    sap.m.MessageToast.show("구매요청이 생성되었습니다.");
                    this.onClose();
                },
                error: (oError) => {
                    console.error("구매요청 생성 실패: ", oError);
                    sap.m.MessageBox.error("구매요청 생성에 실패했습니다. 다시 시도해주세요.");
                }
            });
        },
        onClose() {
            sap.ui.getCore().byId("idDialog").close();
        },

        /**
         * 1. [만능 F4] 자재/플랜트/창고 인풋 필드가 공통으로 바라보는 서치헬프 오픈 함수
         */
        /**
         * [안전성 100% 보장 버전] 공통 Value Help 요청 핸들러
         */
        onValueHelpRequest: function (oEvent) {
            var oView = this.getView();
            var oInput = oEvent.getSource(); 
            var sInputId = oInput.getId();

            // 1. 이미 다이얼로그 객체(_oValueHelpDialog)가 만들어져 있다면 바로 사용
            if (this._oValueHelpDialog) {
                this._oValueHelpDialog.data("targetInput", oInput);
                this._configValueHelpDialog(this._oValueHelpDialog, sInputId);
                this._oValueHelpDialog.open();
                return;
            }

            // 2. 처음 누른 거라면 로드 시작 (this._oValueHelpDialog 변수에 진짜 객체를 직접 저장)
            sap.ui.core.Fragment.load({
                name: "zuimm0001.view.fragments.ValueHelpDialog",
                controller: this
            }).then(function (oDialog) {
                this._oValueHelpDialog = oDialog; // 🌟 껍데기가 아닌 진짜 다이얼로그 인스턴스를 클래스 변수에 저장!
                oView.addDependent(this._oValueHelpDialog);

                // 데이터 꼬리표 저장 및 조립
                this._oValueHelpDialog.data("targetInput", oInput);
                this._configValueHelpDialog(this._oValueHelpDialog, sInputId);
                
                this._oValueHelpDialog.open();
            }.bind(this));
        },

        /**
         * 2. [만능 셋업] 과거 코드의 수동 모델 생성 및 플랜트 필터 로직 100% 이식 버전
         */
        _configValueHelpDialog: function (oDialog, sInputId) {
            if (sInputId.includes("idMatnr")) {
                // 🅰️ 자재코드: 과거 코드의 this._aUniqueMaterials 데이터를 JSONModel로 직접 구워 넣음!
                oDialog.setTitle("자재코드 선택");
                oDialog.setNoDataText("조회된 자재가 없습니다.");
                
                // 🌟 [중요] 내 프로젝트 고유 데이터 주입!
                oDialog.setModel(new JSONModel(this._aUniqueMaterials), "MaterialHelp");
                
                oDialog.bindAggregation("items", {
                    path: "MaterialHelp>/", 
                    template: new sap.m.StandardListItem({
                        title: "{MaterialHelp>Matnr}",       
                        description: "{MaterialHelp>Maktx}",  
                        type: "Active"
                    })
                });

            } else if (sInputId.includes("idWerks")) {
                // 🅱️ 플랜트: 뷰의 메인 OData 기반 모델 사용
                oDialog.setTitle("플랜트 선택");
                oDialog.setNoDataText("조회된 플랜트가 없습니다.");
                
                // 메인 뷰 모델 주소 명시적 상속
                // oDialog.setModel(this.getView().getModel());
                oDialog.setModel(new JSONModel(this._werksSet), "WerksSet");
                
                oDialog.bindAggregation("items", {
                    path: "WerksSet>/", 
                    template: new sap.m.StandardListItem({
                        title: "{WerksSet>WerksId}",  
                        description: "{WerksSet>Name1}", 
                        type: "Active"
                    })
                });

            } else if (sInputId.includes("idLgort")) {
                // 🅲 창고: 과거 코드의 '플랜트 값 연동 필터' 및 'this._lgortSet' 모델 주입 완전 복원!
                oDialog.setTitle("창고 선택");
                oDialog.setNoDataText("조회된 창고가 없습니다.");
                
                // 🌟 [중요] 내 프로젝트 고유 데이터 주입!
                oDialog.setModel(new JSONModel(this._lgortSet), "LgortSet");

                // 🌟 과거 코드에 있던 '플랜트 인풋 값 읽어서 필터링'하는 로직 복원
                var sWerksValue = this.byId("idWerks").getValue(); 
                var aFilters = [];
                if (sWerksValue) {
                    aFilters.push(new Filter("Werks", FilterOperator.EQ, sWerksValue));
                }

                oDialog.bindAggregation("items", {
                    path: "LgortSet>/", 
                    template: new sap.m.StandardListItem({
                        title: "{LgortSet>LgortId}",  
                        description: "{LgortSet>Adrnr}", 
                        info: "{= '플랜트: ' + ${LgortSet>Werks} }", 
                        type: "Active"
                    })
                });
            }
        },
        onConfirmCommonPopup: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var oDialog = oEvent.getSource();
                var oTargetInput = oDialog.data("targetInput");

                if (!oSelectedItem) {
                    return; // 선택 안 하고 닫으면 그냥 종료
                }

                var sTargetInputId = oTargetInput.getId();

                if (sTargetInputId.includes("idMatnr")) {
                    let sSelectedMatnr = oSelectedItem.getBindingContext("MaterialHelp").getProperty("Matnr");
                    oTargetInput.setValue(sSelectedMatnr);
                    
                } else if (sTargetInputId.includes("idWerks")) {
                    let sSelectedWerks = oSelectedItem.getBindingContext().getProperty("WerksId");
                    oTargetInput.setValue(sSelectedWerks);
                    
                } else if (sTargetInputId.includes("idLgort")) {
                    let sSelectedLgort = oSelectedItem.getBindingContext("LgortSet").getProperty("LgortId");
                    let sSelectedWerks = oSelectedItem.getBindingContext("LgortSet").getProperty("Werks");
                    
                    oTargetInput.setValue(sSelectedLgort);
                    this.byId("idWerks").setValue(sSelectedWerks);
                }
             
        },
        onSearchValueHelp: function (oEvent) {
            // 1. 사용자가 검색창에 입력한 텍스트 가져오기
            var sValue = oEvent.getParameter("value");
            
            // 2. 팝업창의 리스트 바인딩 객체 가져오기
            var oBinding = oEvent.getSource().getBinding("items");
            if (!oBinding) { return; }

            // 3. F4를 요청했던 원본 인풋의 ID를 추적하여 어떤 데이터셋인지 알아냅니다.
            var oTargetInput = oEvent.getSource().data("targetInput");
            var sTargetInputId = oTargetInput ? oTargetInput.getId() : "";
            
            var aFilters = [];

            // 검색어가 있을 때만 필터 배열 구성
            if (sValue) {
                if (sTargetInputId.includes("idMatnr")) {
                    // 🅰️ 자재코드 검색: 자재코드 또는 자재명에 포함되어 있으면 매칭
                    aFilters.push(new Filter({
                        filters: [
                            new Filter("Matnr", FilterOperator.Contains, sValue),
                            new Filter("Maktx", FilterOperator.Contains, sValue)
                        ],
                        and: false // OR 조건
                    }));
                } else if (sTargetInputId.includes("idWerks")) {
                    // 🅱️ 플랜트 검색: 플랜트코드 또는 플랜트명 매칭
                    aFilters.push(new Filter({
                        filters: [
                            new Filter("WerksId", FilterOperator.Contains, sValue),
                            new Filter("Name1", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    }));
                } else if (sTargetInputId.includes("idLgort")) {
                    // 🅲 창고 검색: 창고코드 또는 창고주소 매칭
                    aFilters.push(new Filter({
                        filters: [
                            new Filter("LgortId", FilterOperator.Contains, sValue),
                            new Filter("Adrnr", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    }));
                }
            }

            // 4. 조립된 필터를 SelectDialog 리스트에 최종 바인딩 적용!
            oBinding.filter(aFilters);
        },
        // =======================================================
        // 제안 기능 (Input 타이핑 시 자동완성 필터링)
        // =======================================================
        onSuggestMatnr: function (oEvent) {
            var sValue = oEvent.getParameter("suggestValue");
            var oInput = oEvent.getSource();
            var aFilters = [];

            if (sValue) {
                aFilters = [
                    new sap.ui.model.Filter({
                        filters: [
                            new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, sValue),
                            new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.Contains, sValue)
                        ],
                        and: false // 자재코드 또는 자재명 둘 중 하나라도 포함되면 제안 리스트에 표시
                    })
                ];
            }

            // Input의 suggestionItems 바인딩 객체를 가져와서 필터 적용
            var oBinding = oInput.getBinding("suggestionItems");
            if (oBinding) {
                oBinding.filter(aFilters);
            }
        },
        // 1. [신규 추가] 상단 필터바에서 [Go]를 누르거나 화면이 처음 켜질 때 실행되는 검색 이벤트
        onSearch: function () {
            // 1. 메인 화면의 각 Input 컨트롤러 객체 가져오기
            var oMatnrInput = this.byId("idMatnr");
            var oWerksInput = this.byId("idWerks");
            var oLgortInput = this.byId("idLgort");

            // 2. 사용자가 입력한 값(Value) 추출하기
            var sMatnr = oMatnrInput ? oMatnrInput.getValue().trim() : "";
            var sWerks = oWerksInput ? oWerksInput.getValue().trim() : "";
            var sLgort = oLgortInput ? oLgortInput.getValue().trim() : "";

            // 3. 백엔드로 보낼 필터 배열 생성
            var aFilters = [];

            // 자재코드가 입력되었다면 필터 추가 (대소문자 구분을 위해 테크니컬 네임 확인 필수)
            if (sMatnr) {
                aFilters.push(new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.EQ, sMatnr));
            }

            // 플랜트가 입력되었다면 필터 추가
            if (sWerks) {
                aFilters.push(new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.EQ, sWerks));
            }

            // 창고가 입력되었다면 필터 추가
            if (sLgort) {
                // 앞서 대소문자 이슈가 있었으므로 백엔드 엔티티셋 구조가 대문자 'LGORTID'인지 'LgortId'인지 확인 후 매칭하세요!
                aFilters.push(new sap.ui.model.Filter("Lgort", sap.ui.model.FilterOperator.EQ, sLgort));
            }

            // 4. 메인 테이블의 바인딩 객체 가져오기
            // (메인 뷰 XML의 <Table> 또는 <List> 태그에 지정된 id 값을 적어주세요. 예: idMainTable)
            var oTable = this.byId("idStockTable");

            if (oTable) {
                // 테이블의 행(Rows 또는 Items) 바인딩 객체를 추출합니다.
                // UI5 Table 종류(sap.m.Table은 "items", sap.ui.table.Table은 "rows")에 맞게 바인딩 이름을 적어줍니다.
                var oBinding = oTable.getBinding("items");


                if (oBinding) {
                    // 🌟 [핵심] 테이블 바인딩에 필터를 적용하여 백엔드에 새로운 $filter 요청을 보냅니다.
                    oBinding.filter(aFilters);

                    // 5. OData 응답이 와서 테이블 데이터가 새로고침되는 시점에 차트도 함께 업데이트 되도록 이벤트를 묶어줍니다.
                    oBinding.attachEventOnce("dataReceived", function () {
                        // 데이터 로드가 완벽히 끝난 후 차트 데이터 갱신 로직 실행
                        this._updateChartData();
                    }.bind(this));

                } else {
                    console.error("테이블 바인딩 객체를 찾을 수 없습니다.");
                }
            } else {
                console.error("메인 테이블 컨트롤을 찾을 수 없습니다. ID를 확인해 주세요.");
            }

            // 예시: OData 데이터 로드가 완료되는 시점이나 테이블 바인딩 완료 후 아래 함수를 실행합니다.
            // this._updateChartData();
        },
        //======================================================
        // 차트 데이터 갱신 함수: 테이블 바인딩 데이터를 기반으로 차트에 표시할 위험 자재 건수를 계산하여 JSON 모델로 변환
        //======================================================
        _updateChartData: function () {
            var oTable = this.byId("idStockTable");
            if (!oTable) { return; }

            var oBinding = oTable.getBinding("items");
            // var aContexts = oBinding ? oBinding.getCurrentContexts() : [];
            var aContexts = oBinding ? oBinding.getContexts() : [];

            var oCountMap = {};

            // 🌟 [1단계] "플랜트-창고"를 조합하여 각각 독립된 고유한 방을 미리 개설합니다.
            aContexts.forEach(function (oContext) {
                var oRowData = oContext.getObject();
                var sWerks = oRowData.Werks; // 플랜트 (예: P100, P200)
                var sLgort = oRowData.Lgort; // 창고 (예: 1000)

                if (sWerks && sLgort && sLgort !== "4000") { // 창고 코드가 "4000"인 경우는 제외 (예: 특정 창고 제외)
                    // 주머니 이름표를 "P100-1000", "P200-1000" 형태로 완벽히 격리시킵니다!
                    var sKey = sWerks + "-" + sLgort;
                    if (!oCountMap[sKey]) {
                        oCountMap[sKey] = 0; // 위험건수 0건으로 초기화
                    }
                }
            });

            // 🔎 [2단계] 루프를 돌며 가용재고 < 안전재고인 위험 자재들의 카운트를 누적합니다.
            aContexts.forEach(function (oContext) {
                var oRowData = oContext.getObject();
                var sWerks = oRowData.Werks;
                var sLgort = oRowData.Lgort;
                var nLabst = Number(oRowData.Labst); // 가용재고
                var nEisbe = Number(oRowData.Eisbe); // 안전재고

                if (sWerks && sLgort && sLgort !== "4000" && (nLabst < nEisbe)) {
                    var sKey = sWerks + "-" + sLgort;
                    oCountMap[sKey]++; // 고유 방에 카운트 업!
                }
            });

            // 📊 [3단계] 차트 라이브러리가 먹을 수 있게 쪼개서 배열로 배달합니다.
            var aChartData = [];
            // eslint-disable-next-line guard-for-in
            for (var sCombinedKey in oCountMap) {
                // "P100-1000" 으로 묶여있던 이름표를 다시 반으로 쪼갭니다.
                var aSplit = sCombinedKey.split("-");
                var sWerksKey = aSplit[0]; // P100
                var sLgortKey = aSplit[1]; // 1000

                aChartData.push({
                    Werks: sWerksKey,               // 차트가 인지할 플랜트 대분류 그룹
                    Lgort: sLgortKey,               // 차트가 인지할 창고 소분류 축
                    Count: oCountMap[sCombinedKey]  // 해당 그룹의 실시간 위험 건수
                });
            }

            // 로컬 JSON 모델 생성 및 차트 뷰에 주입
            var oChartModel = new sap.ui.model.json.JSONModel({
                Issues: aChartData
            });
            this.getView().setModel(oChartModel, "ChartModel");
        },

        // 3. [🌟 교정 구역] 차트 막대(위험 자재 건수)를 클릭했을 때 테이블 필터링 연동 함수
        onSelectChartSlice: function (oEvent) {
            var aSelectedData = oEvent.getParameter("data");
            var oTable = this.byId("idStockTable");
            if (!oTable) { return; }

            var oBinding = oTable.getBinding("items");

            if (aSelectedData && aSelectedData.length > 0) {
                // 🌟 차트 차원(Dimension) 정의에 맞춰 창고 코드를 정확히 빼옵니다.
                // 만약 text가 "창고"가 아니라 데이터 바인딩 명칭이라면 Lgort 등으로 맞춰야 합니다.
                var sSelectedLgort = aSelectedData[0].data.창고 || aSelectedData[0].data.Lgort;

                // 🌟 [핵심] 창고 일치 여부와 재고 부족 조건을 동시 검증하는 커스텀 필터 생성!
                var oCombinedFilter = new sap.ui.model.Filter({
                    path: "", // 전체 로우 데이터를 검사하기 위해 비워둠
                    test: function (oRowData) {
                        if (!oRowData) { return false; }
                        
                        var nLabst = Number(oRowData.Labst); // 가용재고
                        var nEisbe = Number(oRowData.Eisbe); // 안전재고
                        
                        // 조건: 클릭한 창고 코드이면서 동시에 재고가 부족한(Labst < Eisbe) 자재만 통과!
                        return oRowData.Lgort === sSelectedLgort && nLabst < nEisbe;
                    }
                });

                // 테이블에 만능 필터 주입
                oBinding.filter([oCombinedFilter]);

            } else {
                // 차트 빈 곳을 누르면 필터를 해제하되, 
                // 메인 화면 기본 규칙이 원래 부족 자재만 보여주는 상태였다면 기본 부족 필터로 원복해야 합니다.
                var oDefaultFilter = new sap.ui.model.Filter({
                    path: "",
                    test: function (oRowData) {
                        return oRowData && Number(oRowData.Labst) < Number(oRowData.Eisbe);
                    }
                });
                oBinding.filter([oDefaultFilter]);
            }
        }
    });
});